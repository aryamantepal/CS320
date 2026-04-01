import React from "react";
import { View, StyleSheet, useColorScheme } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "../constants/Colors";

export default function ThemedView({
    style,
    children,
    safe = true, // whether to use SafeAreaView
}) {
    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme] ?? Colors.light;

    const Container = safe ? SafeAreaView : View;

    return (
        <Container
            style={[
                styles.container,
                { backgroundColor: theme.background },
                style,
            ]}
        >
            {children}
        </Container>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20
    },
});