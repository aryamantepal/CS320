import React, { useState, useCallback } from "react";
import { ScrollView, ActivityIndicator, Text } from "react-native";
import { useFocusEffect } from "expo-router";
import ThemedCard from "../../components/ThemedCard";
import ThemedView from "../../components/ThemedView.jsx";
import { getUserId, API_URL } from "../../utils/auth";

export default function Home() {
    const [feed, setFeed] = useState([]);
    const [loading, setLoading] = useState(true);

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
                        onPress={() => {}}
                    />
                ))}
            </ScrollView>
        </ThemedView>
    );
}
