import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect, useState } from "react";
import { getUser } from "../utils/auth";
import { ThemeProvider } from "../context/ThemeContext";
import { StatusBar } from "react-native";

// Patch global fetch so all requests skip the ngrok free-tier browser warning.
// Safe no-op against non-ngrok hosts; the header is just ignored elsewhere.
const _origFetch = global.fetch;
global.fetch = (input, init = {}) => {
    const headers = new Headers(init.headers || {});
    if (!headers.has("ngrok-skip-browser-warning")) {
        headers.set("ngrok-skip-browser-warning", "1");
    }
    return _origFetch(input, { ...init, headers });
};

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
