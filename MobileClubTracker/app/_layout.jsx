import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect, useState } from "react";
import { getUser } from "../utils/auth";
import { ThemeProvider } from "../context/ThemeContext";
import { StatusBar } from "react-native";

function AuthGate({ children }) {
    const router = useRouter();
    const segments = useSegments();
    const [ready, setReady] = useState(false);

    useEffect(() => {
        const checkAuth = async () => {
            const user = await getUser();
            const inAuthGroup = segments[0] === "(auth)";

            if (!user && !inAuthGroup) {
                router.replace("/login");
                return;
            }

            if (user && inAuthGroup) {
                router.replace("/(tabs)");
                return;
            }

            setReady(true);
        };

        checkAuth();
    }, [segments]);

    if (!ready) return null;

    return children;
}

export default function RootLayout() {
    return (
        <ThemeProvider>
            <AuthGate>
                <StatusBar style="auto" />
                <Stack screenOptions={{ headerShown: false }} />
            </AuthGate>
        </ThemeProvider>
    );
}