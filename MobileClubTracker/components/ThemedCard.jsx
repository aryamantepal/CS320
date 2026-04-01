import React from "react";
import {
    View,
    StyleSheet,
    useColorScheme,
    Pressable,
    Image,
} from "react-native";
import { Colors } from "../constants/Colors";

export default function ThemedCard({
    children,
    style,
    onPress,
    image,
    title,
    subtitle,
}) {
    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme] ?? Colors.light;

    const content = (
        <View style={styles.row}>
            <Image
                source={
                    image
                        ? { uri: image }
                        : require("../assets/adaptive-icon.png")
                }
                style={styles.avatar}
            />

            <View style={styles.textColumn}>
                {title && <Text style={styles.title}>{title}</Text>}

                {children}
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
        <View
            style={[
                styles.card,
                { backgroundColor: theme.uiBackground },
                style,
            ]}
        >
            {content}
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        width: "95%",
        padding: 16,
        borderRadius: 16,
        marginBottom: 15,

        shadowColor: "#000",
        shadowOpacity: 0.08,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 3 },

        elevation: 4,
    },

    row: {
        flexDirection: "row",
        alignItems: "center",
    },

    avatar: {
        width: 45,
        height: 45,
        borderRadius: 22.5,
        marginRight: 12,
        backgroundColor: "#ccc",
    },

    content: {
        flex: 1,
    },

    textColumn: {
        flex: 1,
        flexDirection: "column",
        justifyContent: "center",
    },

    title: {
        fontSize: 16,
        fontWeight: "600",
    },

    subtitle: {
        fontSize: 13,
        color: "gray",
        marginTop: 2,
    },
});