import React from "react";
import { Pressable, Text, StyleSheet, useColorScheme } from "react-native";
import { Colors } from "../constants/Colors";

export default function ThemedButton({
    title,
    onPress,
    style,
    textStyle,
}) {
    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme] ?? Colors.light;

    return (
        <Pressable
            onPress={onPress}
            style={({ pressed }) => [
                styles.button,
                {
                    backgroundColor: theme.tint,
                    opacity: pressed ? 0.85 : 1,
                },
                style,
            ]}
        >
            <Text
                style={[
                    styles.text,
                    { color: theme.buttonText || "white" },
                    textStyle,
                ]}
            >
                {title}
            </Text>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    button: {
        padding: 14,
        borderRadius: 10,
        alignItems: "center",
        justifyContent: "center",
    },
    text: {
        fontWeight: "600",
        fontSize: 16,
    },
});