// components/SearchBar.jsx
import React from "react";
import {
    View,
    TextInput,
    StyleSheet,
    useColorScheme,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../constants/Colors";

export default function SearchBar({ value, onChangeText, placeholder = "Search..." }) {
    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme] ?? Colors.light;

    return (
        <View style={[styles.container, { backgroundColor: theme.uiBackground }]}>
            {/* The magnifying glass icon sits inside the input row */}
            <Ionicons
                name="search"
                size={18}
                color={theme.iconColor}
                style={styles.icon}
            />
            <TextInput
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder}
                placeholderTextColor={theme.iconColor}
                style={[styles.input, { color: theme.text }]}
                autoCapitalize="none"
                autoCorrect={false}
                // clearButtonMode shows an X button on iOS when there's text
                clearButtonMode="while-editing"
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: "row",
        alignItems: "center",
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 8,
        marginBottom: 16,
    },
    icon: {
        marginRight: 8,
    },
    input: {
        flex: 1,
        fontSize: 16,
    },
});