import React, { useState } from "react";
import {
    Text,
    TextInput,
    Pressable,
    StyleSheet,
    useColorScheme,
    KeyboardAvoidingView, // ← add this
    Platform,             // ← add this so we can check iOS vs Android
    ScrollView,           // ← add this so content can scroll when keyboard is tall
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
        try {
            await loginUser(email, password); // now passes password too
            router.replace("/(tabs)");
        } catch (err) {
            alert(err.message); // shows "Invalid email or password" from server
        }
    };

    return (
        <ThemedView style={styles.container} safe={true}>
            {/*
                KeyboardAvoidingView sits inside ThemedView.
                - behavior="padding" adds bottom padding equal to keyboard height (iOS)
                - On Android we pass undefined because the OS handles it natively
                - style={{ flex: 1 }} is important — without it, the view
                  collapses to zero height and nothing shows up
            */}
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === "ios" ? "padding" : undefined}
            >
                {/*
                    ScrollView ensures that if the keyboard is very tall
                    (like on a small phone), the user can still scroll up
                    to see all the fields. Without this, content could get
                    permanently hidden behind the keyboard.
                    
                    contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}
                    keeps your form centered vertically, just like before.
                */}
                <ScrollView
                    contentContainerStyle={styles.container}
                    keyboardShouldPersistTaps="handled" // tapping outside keyboard dismisses it
                >
                    <Text style={[styles.title, { color: theme.title }]}>
                        Login
                    </Text>

                    <TextInput
                        placeholder="Email"
                        placeholderTextColor={theme.iconColor}
                        value={email}
                        onChangeText={setEmail}
                        autoCapitalize="none"
                        style={[styles.input, {
                            borderColor: theme.iconColor,
                            color: theme.text,
                            backgroundColor: theme.uiBackground,
                        }]}
                    />

                    <TextInput
                        placeholder="Password"
                        placeholderTextColor={theme.iconColor}
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                        style={[styles.input, {
                            borderColor: theme.iconColor,
                            color: theme.text,
                            backgroundColor: theme.uiBackground,
                        }]}
                    />

                    <Pressable
                        style={[styles.button, { backgroundColor: Colors.primary }]}
                        onPress={handleLogin}
                    >
                        <Text style={[styles.buttonText, { color: "#fff" }]}>
                            Login
                        </Text>
                    </Pressable>

                    <Pressable onPress={() => router.push("/register")}>
                        <Text style={[styles.link, { color: Colors.primary }]}>
                            Don't have an account? Sign Up
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
        paddingHorizontal: 20,
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