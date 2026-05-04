import React, { useState, useCallback } from "react";
import { ScrollView, ActivityIndicator, Text } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import ThemedCard from "../../components/ThemedCard";
import ThemedView from "../../components/ThemedView.jsx";
import { getUserId, API_URL } from "../../utils/auth";
import { addEventToCalendar } from "../../utils/calendar";
import { useTheme } from "../../context/ThemeContext";

export default function Home() {
    const { isDarkMode } = useTheme();
    const router = useRouter();

    const [feed, setFeed] = useState([]);
    const [loading, setLoading] = useState(true);
    const [itemColors, setItemColors] = useState({});

    function randomRgb() {
        const r = Math.floor(Math.random() * 120) + 80;
        const g = Math.floor(Math.random() * 120) + 80;
        const b = Math.floor(Math.random() * 120) + 80;
        return {
            base: `rgb(${r},${g},${b})`,
            light: `rgb(${Math.round(r + (255 - r) * 0.4)},${Math.round(g + (255 - g) * 0.4)},${Math.round(b + (255 - b) * 0.4)})`,
        };
    }

    useFocusEffect(
        useCallback(() => {
            const loadFeed = async () => {
                setLoading(true);
                const userId = await getUserId();
                if (!userId) { setLoading(false); return; }

                try {
                    // Fetch feed and existing user colors in parallel
                    const [feedRes, colorsRes] = await Promise.all([
                        fetch(`${API_URL}/feed/${userId}`),
                        fetch(`${API_URL}/users/${userId}/post-colors`),
                    ]);
                    const feedData = Array.isArray(await feedRes.json()) ? await feedRes.json() : [];
                    const existingColors = await colorsRes.json();

                    // For any post without a color yet, generate one and save it
                    const newColors = { ...existingColors };
                    const toSave = [];

                    feedData.forEach((item) => {
                        const key = `${item.type}-${item.id}`;
                        if (!newColors[key]) {
                            const { base, light } = randomRgb();
                            newColors[key] = item.type === "event" ? base : light;
                            toSave.push({ postType: item.type, postId: item.id, color: newColors[key] });
                        }
                    });

                    // Save new colors to backend in parallel
                    await Promise.all(
                        toSave.map((c) =>
                            fetch(`${API_URL}/users/${userId}/post-colors`, {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ ...c, userId }),
                            })
                        )
                    );

                    setFeed(feedData);
                    setItemColors(newColors);
                } catch (err) {
                    console.error("Failed to load feed:", err);
                } finally {
                    setLoading(false);
                }
            };
        }, [])
    );

    if (loading) {
        return (
            <ThemedView safe={true} style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
                <ActivityIndicator size="large" />
            </ThemedView>
        );
    }

    return (
        <ThemedView style={{ paddingHorizontal: 20 }} safe={true}>
            <ScrollView
                style={{ backgroundColor: "transparent" }}
                contentContainerStyle={{ paddingBottom: 40 }}
            >
                {feed.length === 0 && (
                    <Text style={{ textAlign: "center", marginTop: 40, color: "gray", fontStyle: "italic" }}>
                        Follow some clubs to see their posts here.
                    </Text>
                )}
                {feed.map((item) => (
                    <ThemedCard
                        key={`${item.type}-${item.id}`}
                        clubName={item.organization.name}
                        title={item.title}
                        subtitle={
                            item.type === "event"
                                ? `📍 ${item.location} · ${new Date(item.startDateTime).toLocaleDateString()}`
                                : item.body
                        }
                        bannerColor={itemColors[`${item.type}-${item.id}`] ?? undefined}
                        onPress={() =>
                            router.push({
                                pathname: "/postDetail",
                                params: {
                                    type: item.type,
                                    title: item.title,
                                    body: item.body ?? "",
                                    location: item.location ?? "",
                                    startDateTime: item.startDateTime ? String(item.startDateTime) : "",
                                    clubName: item.organization.name,
                                },
                            })
                        }
                        onAddToCalendar={
                            item.type === "event"
                                ? () =>
                                    addEventToCalendar({
                                        title: item.title,
                                        location: item.location,
                                        startDateTime: item.startDateTime,
                                        clubName: item.organization.name,
                                    })
                                : undefined
                        }
                    />
                ))}
            </ScrollView>
        </ThemedView>
    );
}