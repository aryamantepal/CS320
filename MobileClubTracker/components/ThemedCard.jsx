import React from "react";
import {
    View,
    StyleSheet,
    useColorScheme,
    Pressable,
    Image,
    Text,
} from "react-native";
import { Colors } from "../constants/Colors";

export default function ThemedCard({
    style,
    onPress,
    image,
    title,
    subtitle,
    clubName,
}) {
    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme] ?? Colors.light;

    const content = (
        <View style={styles.row}>

            {/* LEFT COLUMN: image + club name */}
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
                    <Text style={styles.clubName}>{clubName}</Text>
                )}
            </View>

            {/* VERTICAL DIVIDER */}
            <View style={styles.verticalDivider} />

            {/* RIGHT COLUMN: title + horizontal divider + subtitle */}
            <View style={styles.rightColumn}>
                {title && (
                    <Text style={styles.title}>{title}</Text>
                )}

                {/* HORIZONTAL DIVIDER */}
                <View style={styles.horizontalDivider} />

                {subtitle && (
                    <Text style={styles.subtitle}>{subtitle}</Text>
                )}
            </View>

        </View>
    );

    if (onPress) {
        return (
            <Pressable
                onPress={onPress}
                style={({ pressed }) => [
                    styles.card,
                    { backgroundColor: theme.uiBackground },
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
        overflow: "hidden", // keeps dividers flush to card edges
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

    // LEFT
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

    // DIVIDERS
    verticalDivider: {
        width: 2,
        backgroundColor: "#000",
    },
    horizontalDivider: {
        height: 2,
        backgroundColor: "#000",
        marginVertical: 0,
    },

    // RIGHT
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
        flex: 1,
    },
});