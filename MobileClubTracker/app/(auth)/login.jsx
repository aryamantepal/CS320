import React, { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, useColorScheme } from "react-native";
import { loginUser } from "../../utils/auth";
import { useRouter } from "expo-router";
import { Colors } from "../../constants/Colors";

const ADMIN_EMAIL = "admin@club.com";
const ADMIN_PASSWORD = "admin123";

export default function Login() {
    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme] ?? Colors.light;

    const router = useRouter();

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
        <View style={styles.container}>
            <Text style={styles.title}>Admin Login</Text>

            <TextInput
                placeholder="Email"
                value={email}
                onChangeText={setEmail}
                style={styles.input}
                autoCapitalize="none"
            />

            <TextInput
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
                style={styles.input}
                secureTextEntry
            />

            <Pressable style={styles.button} onPress={handleLogin}>
                <Text style={styles.buttonText}>Login</Text>
            </Pressable>

            {/* Link to registration */}
            <Pressable onPress={() => router.replace("/register")}>
                <Text style={styles.link}>Don't have an account? Sign Up</Text>
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "center",
        padding: 20,
    },
    title: {
        fontSize: 28,
        marginBottom: 30,
        textAlign: "center",
        fontWeight: "bold",
    },
    input: {
        borderWidth: 1,
        borderColor: "#ccc",
        padding: 12,
        marginBottom: 15,
        borderRadius: 8,
    },
    button: {
        backgroundColor: "black",
        padding: 15,
        borderRadius: 8,
    },
    buttonText: {
        color: "white",
        textAlign: "center",
        fontWeight: "bold",
    },
    link: {
        textAlign: "center",
        color: "blue",
        marginTop: 15,
    },
});