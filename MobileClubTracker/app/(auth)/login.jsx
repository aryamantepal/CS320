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

import ThemedView from "../../components/ThemedView";


const ADMIN_EMAIL = "admin@club.com";
const ADMIN_PASSWORD = "admin123";

export default function Login() {
    const router = useRouter();

    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme] ?? Colors.light;

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const isValidEmail = (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    const handleLogin = async () => {
        if (!isValidEmail(email)) {
            alert("Please enter a valid email address");
            return;
        }

        if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
            await loginUser(email);
            router.replace("/(tabs)");
        } else {
            alert("Invalid admin credentials");
        }
    };

    return (
        <ThemedView style={styles.container}>
            <Text style={[styles.title, { color: theme.title }]}>
                Login
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

            {/* Login Button */}
            <Pressable
                style={[
                    styles.button,
                    { backgroundColor: Colors.primary },
                ]}
                onPress={handleLogin}
            >
                <Text style={[styles.buttonText, { color: "#fff" }]}>
                    Login
                </Text>
            </Pressable>

            {/* Register Link */}
            <Pressable onPress={() => router.push("/register")}>
                <Text
                    style={[
                        styles.link,
                        { color: Colors.primary },
                    ]}
                >
                    Don't have an account? Sign Up
                </Text>
            </Pressable>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: {
        justifyContent: "center",
    },
    title: {
        fontSize: 28,
        marginBottom: 30,
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
        marginTop: 10,
    },
    buttonText: {
        textAlign: "center",
        fontWeight: "bold",
    },
    link: {
        textAlign: "center",
        marginTop: 15,
    },
});