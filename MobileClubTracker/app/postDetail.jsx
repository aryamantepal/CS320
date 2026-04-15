import React from "react";
import {
    View,
    Text,
    ScrollView,
    Pressable,
    StyleSheet,
    useColorScheme,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Colors } from "../constants/Colors";
import ThemedView from "../components/ThemedView";
import { addEventToCalendar } from "../utils/calendar";

export default function PostDetail() {
    const router = useRouter();
    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme] ?? Colors.light;

    const { type, title, body, location, startDateTime, clubName } =
        useLocalSearchParams();

    const isEvent = type === "event";

    // startDateTime arrives as a string from router params
    const dateObj = startDateTime ? new Date(startDateTime) : null;
    const dateStr = dateObj
        ? dateObj.toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
          })
        : null;
    const timeStr = dateObj
        ? dateObj.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
        : null;

    return (
        <ThemedView safe={true} style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={styles.content}>
                <Pressable onPress={() => router.back()} style={styles.backButton}>
                    <Text style={[styles.backText, { color: "#007AFF" }]}>‹ Back</Text>
                </Pressable>

                {/* Type badge */}
                <View
                    style={[
                        styles.badge,
                        { backgroundColor: isEvent ? "#007AFF" : "#34C759" },
                    ]}
                >
                    <Text style={styles.badgeText}>
                        {isEvent ? "📅 Event" : "📣 Announcement"}
                    </Text>
                </View>

                {/* Club attribution */}
                <Text style={[styles.clubName, { color: theme.iconColor }]}>
                    {clubName?.toUpperCase()}
                </Text>

                {/* Title */}
                <Text style={[styles.title, { color: theme.text }]}>{title}</Text>

                {/* Event details box */}
                {isEvent && (
                    <View
                        style={[styles.detailsBox, { backgroundColor: theme.uiBackground }]}
                    >
                        {location ? (
                            <View style={styles.detailRow}>
                                <Text style={styles.detailIcon}>📍</Text>
                                <Text style={[styles.detailText, { color: theme.text }]}>
                                    {location}
                                </Text>
                            </View>
                        ) : null}
                        {dateStr ? (
                            <View style={styles.detailRow}>
                                <Text style={styles.detailIcon}>🗓</Text>
                                <Text style={[styles.detailText, { color: theme.text }]}>
                                    {dateStr}
                                </Text>
                            </View>
                        ) : null}
                        {timeStr ? (
                            <View style={styles.detailRow}>
                                <Text style={styles.detailIcon}>🕐</Text>
                                <Text style={[styles.detailText, { color: theme.text }]}>
                                    {timeStr}
                                </Text>
                            </View>
                        ) : null}
                        <Pressable
                            style={({ pressed }) => [
                                styles.addToCalendarBtn,
                                { opacity: pressed ? 0.75 : 1 },
                            ]}
                            onPress={() =>
                                addEventToCalendar({
                                    title,
                                    location,
                                    startDateTime,
                                    clubName,
                                })
                            }
                        >
                            <Text style={styles.addToCalendarText}>📅  Add to Calendar</Text>
                        </Pressable>
                    </View>
                )}

                {/* Announcement body */}
                {!isEvent && body ? (
                    <Text style={[styles.body, { color: theme.text }]}>{body}</Text>
                ) : null}
            </ScrollView>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    content: { padding: 24, paddingBottom: 60 },
    backButton: { marginBottom: 24 },
    backText: { fontSize: 17, fontWeight: "500" },
    badge: {
        alignSelf: "flex-start",
        borderRadius: 20,
        paddingVertical: 5,
        paddingHorizontal: 14,
        marginBottom: 16,
    },
    badgeText: {
        color: "#fff",
        fontSize: 12,
        fontWeight: "700",
        textTransform: "uppercase",
        letterSpacing: 0.6,
    },
    clubName: {
        fontSize: 12,
        fontWeight: "700",
        letterSpacing: 1,
        marginBottom: 8,
    },
    title: {
        fontSize: 26,
        fontWeight: "700",
        lineHeight: 34,
        marginBottom: 24,
    },
    detailsBox: {
        borderRadius: 14,
        padding: 16,
        gap: 14,
    },
    addToCalendarBtn: {
        marginTop: 16,
        backgroundColor: "#007AFF",
        borderRadius: 14,
        paddingVertical: 14,
        alignItems: "center",
    },
    addToCalendarText: {
        color: "#fff",
        fontWeight: "700",
        fontSize: 15,
    },
    detailRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
    detailIcon: { fontSize: 18, lineHeight: 24 },
    detailText: { fontSize: 16, flex: 1, lineHeight: 22 },
    body: { fontSize: 16, lineHeight: 28 },
});