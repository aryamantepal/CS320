import React from "react";
import {
    View,
    StyleSheet,
    Pressable,
    Image,
    Text,
} from "react-native";
import { Colors } from "../constants/Colors";
import { useTheme } from "../context/ThemeContext";

function getTextColorForBackground(bgColor) {
    if (!bgColor) return null;
    // Parse rgb(r,g,b) string
    const match = bgColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (!match) return null;
    const r = parseInt(match[1]);
    const g = parseInt(match[2]);
    const b = parseInt(match[3]);
    // Standard luminance formula
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5 ? "#000000" : "#ffffff";
}

export default function ThemedCard({
    style,
    onPress,
    onDelete,
    onAddToCalendar,   // ← NEW: only passed for event-type cards
    image,
    title,
    subtitle,
    clubName,
    bannerColor,
}) {
    const { isDarkMode } = useTheme();
    const theme = Colors[isDarkMode ? "dark" : "light"] ?? Colors.light;
    const dividerColor = isDarkMode ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.09)";

    const cardTextColor = bannerColor ? getTextColorForBackground(bannerColor) : null;
    
    const content = (
        <View style={styles.row}>
            {/* LEFT COLUMN */}
            <View style={styles.leftColumn}>
                <Image
                    source={
                        image
                            ? { uri: image }
                            : require("../assets/adaptive-icon.png")
                    }
                    style={styles.avatar}
                />
                {clubName && (
                    <Text style={[styles.clubName, { color: cardTextColor ?? theme.text }]}>
                        {clubName}
                    </Text>
                )}
            </View>

            {/* VERTICAL DIVIDER */}
            <View style={[styles.verticalDivider, { backgroundColor: dividerColor }]} />

            {/* RIGHT COLUMN */}
            <View style={styles.rightColumn}>
                {title && (
                    <Text style={[styles.title, { color: cardTextColor ?? theme.text }]}>{title}</Text>
                )}

                <View style={[styles.horizontalDivider, { backgroundColor: dividerColor }]} />

                {subtitle && (
                    <Text style={[styles.subtitle, { color: cardTextColor ? `${cardTextColor}cc` : "gray" }]}>{subtitle}</Text>
                )}

                {/* CALENDAR BUTTON — only shows for events */}
                {onAddToCalendar && (
                    <Pressable
                        onPress={(e) => {
                            // Stop press from bubbling up to the card's onPress
                            e.stopPropagation?.();
                            onAddToCalendar();
                        }}
                        style={({ pressed }) => [
                            styles.calendarButton,
                            { opacity: pressed ? 0.6 : 1 },
                        ]}
                    >
                        <Text style={styles.calendarButtonText}>📅 Add to Calendar</Text>
                    </Pressable>
                )}
            </View>

            {/* DELETE BUTTON */}
            {onDelete && (
                <Pressable
                    onPress={onDelete}
                    hitSlop={10}
                    style={styles.deleteButton}
                >
                    <Text style={styles.deleteIcon}>✕</Text>
                </Pressable>
            )}
        </View>
    );

    if (onPress) {
        return (
            <Pressable
                onPress={onPress}
                style={({ pressed }) => [
                    styles.card,
                    { backgroundColor: bannerColor || theme.uiBackground },
                    { opacity: pressed ? 0.5 : 1 },
                    style,
                ]}
            >
                {content}
            </Pressable>
        );
    }

    return (
        <View style={[styles.card, { backgroundColor: theme.uiBackground }, style]}>
            {content}
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        width: "95%",
        borderRadius: 16,
        marginBottom: 15,
        overflow: "hidden",
        shadowColor: "#000",
        shadowOpacity: 0.08,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 3 },
        elevation: 4,
    },
    row: {
        flexDirection: "row",
        minHeight: 160,
    },
    leftColumn: {
        width: "35%",
        alignItems: "center",
        justifyContent: "center",
        padding: 12,
        gap: 8,
    },
    avatar: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: "#ccc",
    },
    clubName: {
        fontSize: 13,
        textAlign: "center",
    },
    verticalDivider: {
        width: 2,
    },
    horizontalDivider: {
        height: 2,
    },
    rightColumn: {
        flex: 1,
        flexDirection: "column",
    },
    title: {
        fontSize: 16,
        fontWeight: "700",
        padding: 12,
        flex: 1,
    },
    subtitle: {
        fontSize: 13,
        color: "gray",
        padding: 12,
    },
    calendarButton: {
        alignSelf: "flex-start",
        marginHorizontal: 12,
        marginBottom: 10,
        marginTop: 4,
        paddingVertical: 5,
        paddingHorizontal: 10,
        borderRadius: 20,
        backgroundColor: "#007AFF18",  // very subtle tinted background
    },
    calendarButtonText: {
        fontSize: 12,
        fontWeight: "600",
        color: "#007AFF",
    },
    deleteButton: {
        position: "absolute",
        top: 8,
        right: 10,
        padding: 4,
    },
    deleteIcon: {
        fontSize: 15,
        color: "#FF3B30",
        fontWeight: "700",
    },
});