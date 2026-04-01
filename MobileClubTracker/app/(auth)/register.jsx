import React, { useState } from "react";
import {
    View,
    Text,
    TextInput,
    Pressable,
    StyleSheet,
    useColorScheme,
} from "react-native";
import { useRouter } from "expo-router";
import { loginUser } from "../../utils/auth";
import { Colors } from "../../constants/Colors";

import { ThemedView } from "../../components/ThemedView";

export default function Register() {
    const router = useRouter();

    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme] ?? Colors.light;

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const isValidEmail = (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    const handleRegister = async () => {
        if (!isValidEmail(email)) {
            alert("Please enter a valid email address");
            return;
        }

        if (!password) {
            alert("Password cannot be empty");
            return;
        }

        // TEMP: simulate account creation
        await loginUser(email);

        router.replace("/(tabs)");
    };

    return (
        <ThemedView
            style = {{ justifyContent: "center", backgroundColor: theme.background }}
        >
            <Text style={[styles.title, { color: theme.title }]}>
                Create Account
            </Text>

            {/* Email Input */}
            <TextInput
                placeholder="Email"
                placeholderTextColor={theme.iconColor}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                style={[
                    styles.input,
                    {
                        borderColor: theme.iconColor,
                        color: theme.text,
                        backgroundColor: theme.uiBackground,
                    },
                ]}
            />

            {/* Password Input */}
            <TextInput
                placeholder="Password"
                placeholderTextColor={theme.iconColor}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                style={[
                    styles.input,
                    {
                        borderColor: theme.iconColor,
                        color: theme.text,
                        backgroundColor: theme.uiBackground,
                    },
                ]}
            />

            {/* Sign Up Button */}
            <Pressable
                style={[
                    styles.button,
                    { backgroundColor: Colors.primary },
                ]}
                onPress={handleRegister}
            >
                <Text style={[styles.buttonText, { color: "#fff" }]}>
                    Sign Up
                </Text>
            </Pressable>

            {/* Back to Login */}
            <Pressable onPress={() => router.push("/login")}>
                <Text
                    style={[
                        styles.link,
                        { color: Colors.primary },
                    ]}
                >
                    Already have an account? Login
                </Text>
            </Pressable>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "center",
        padding: 20,
    },
    title: {
        fontSize: 26,
        marginBottom: 25,
        textAlign: "center",
        fontWeight: "bold",
    },
    input: {
        borderWidth: 1,
        padding: 12,
        marginBottom: 15,
        borderRadius: 8,
    },
    button: {
        padding: 15,
        borderRadius: 8,
        marginBottom: 15,
        marginTop: 10,
    },
    buttonText: {
        textAlign: "center",
        fontWeight: "bold",
    },
    link: {
        textAlign: "center",
    },
});