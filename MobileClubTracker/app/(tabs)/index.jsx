import React, { useState, useCallback } from "react";
import { ScrollView, ActivityIndicator, Text } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import ThemedCard from "../../components/ThemedCard";
import ThemedView from "../../components/ThemedView.jsx";
import { getUserId, API_URL } from "../../utils/auth";
import { addEventToCalendar } from "../../utils/calendar";
import { useTheme } from "../../context/ThemeContext";


// Base colors (announcements)
const announcementColors = [
    "#3F51B5", // indigo
    "#4CAF50", // green
    "#FF9800", // orange
    "#E91E63", // pink
    "#5ba29b", // teal
    "#9C27B0", // purple
];

// Lighter versions (events)
const eventColors = [
    "#7986CB", // lighter indigo
    "#81C784", // lighter green
    "#FFB74D", // lighter orange
    "#F06292", // lighter pink
    "#88b6b0", // lighter teal
    "#BA68C8", // lighter purple
];

export default function Home() {
    const { theme, isDarkMode, setIsDarkMode } = useTheme();

    const router = useRouter();

    const [feed, setFeed] = useState([]);
    const [loading, setLoading] = useState(true);
    const getColorForItem = (item) => {
        const name = item.organization.name || "";
        
        // simple hash based on club name
        let hash = 0;
        for (let i = 0; i < name.length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }

        const index = Math.abs(hash) % announcementColors.length;

        return item.type === "event"
            ? eventColors[index]
            : announcementColors[index];
    };

    // Re-fetches every time this tab comes into focus,
    // so following a new club immediately appears in the feed.
    useFocusEffect(
        useCallback(() => {
            const loadFeed = async () => {
                setLoading(true);
                const userId = await getUserId();
                if (!userId) { setLoading(false); return; }

                try {
                    const res = await fetch(`${API_URL}/feed/${userId}`);
                    const data = await res.json();
                    setFeed(Array.isArray(data) ? data : []);
                } catch (err) {
                    console.error("Failed to load feed:", err);
                } finally {
                    setLoading(false);
                }
            };
            loadFeed();
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
                        bannerColor={getColorForItem(item)}

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
                        // Only pass onAddToCalendar for events
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
