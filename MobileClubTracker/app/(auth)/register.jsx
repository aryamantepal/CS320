import React, { useState } from "react";
import {
    Text,
    TextInput,
    Pressable,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { Colors } from "../../constants/Colors";
import { useTheme } from "../../context/ThemeContext";

import { registerUser, loginUser } from "../../utils/auth";

import ThemedView from "../../components/ThemedView";

const MIN_PASSWORD_LENGTH = 6;

export default function Register() {
    const router = useRouter();
    const { theme } = useTheme();

    const [email, setEmail] = useState("");
    const [name, setName] = useState("");
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
        if (password.length < MIN_PASSWORD_LENGTH) {
            alert(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
            return;
        }
        try {
            await registerUser(email, password, name.trim() || null);
            await loginUser(email, password);
            router.replace("/(tabs)");
        } catch (err) {
            alert(err.message); // shows "Email already registered" etc.
        }
    };

    return (
        <ThemedView
            style={styles.container}
        >
            <KeyboardAvoidingView
                style={{ flex: 1, justifyContent: "center", padding: 20 }}
                behavior={Platform.OS === "ios" ? "padding" : undefined}
            >
                <ScrollView
                    style={{ backgroundColor: "transparent" }}
                    contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}
                >
                    <Text style={[styles.title, { color: theme.title }]}>
                        Create Account
                    </Text>

                    <TextInput
                        placeholder="Name (optional)"
                        placeholderTextColor={theme.iconColor}
                        value={name}
                        onChangeText={setName}
                        autoCapitalize="words"
                        style={[styles.input, {
                            borderColor: theme.iconColor,
                            color: theme.text,
                            backgroundColor: theme.uiBackground,
                        }]}
                    />

                    <TextInput
                        placeholder="Email"
                        placeholderTextColor={theme.iconColor}
                        value={email}
                        onChangeText={setEmail}
                        autoCapitalize="none"
                        keyboardType="email-address"
                        style={[
                            styles.input,
                            {
                                borderColor: theme.iconColor,
                                color: theme.text,
                                backgroundColor: theme.uiBackground,
                            },
                        ]}
                    />

                    <TextInput
                        placeholder={`Password (min ${MIN_PASSWORD_LENGTH} chars)`}
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
                </ScrollView>
            </KeyboardAvoidingView>
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
