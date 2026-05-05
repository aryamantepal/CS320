import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { bootstrapAuth, getAuthToken, getUser, refreshUser, API_URL } from "../utils/auth";
import { ThemeProvider } from "../context/ThemeContext";

// Patch global fetch ONCE (idempotent against hot reloads). Adds:
//   • the ngrok skip-browser-warning header so the free-tier proxy doesn't
//     intercept requests.
//   • the Authorization: Bearer <token> header for any request that targets
//     our own API_URL. Other hosts (Photon, Supabase, Expo Push) are left
//     untouched so we don't leak the session token to third parties.
if (!global.__cubeFetchPatched) {
    global.__cubeFetchPatched = true;
    const _origFetch = global.fetch;
    global.fetch = (input, init = {}) => {
        const headers = new Headers(init.headers || {});
        if (!headers.has("ngrok-skip-browser-warning")) {
            headers.set("ngrok-skip-browser-warning", "1");
        }
        const url = typeof input === "string" ? input : input?.url ?? "";
        if (API_URL && url.startsWith(API_URL) && !headers.has("Authorization")) {
            const token = getAuthToken();
            if (token) headers.set("Authorization", `Bearer ${token}`);
        }
        return _origFetch(input, { ...init, headers });
    };
}

function AuthGate({ children }) {
    const router = useRouter();
    const segments = useSegments();
    const [ready, setReady] = useState(false);

    useEffect(() => {
        const checkAuth = async () => {
            // First mount: hydrate the in-memory auth cache from AsyncStorage.
            await bootstrapAuth();
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

            // Refresh /me in the background so role/managedOrgs stay current
            // even if the cached login response is stale (e.g. user was
            // promoted to manager since their last login).
            if (user) refreshUser();

            setReady(true);
        };

        checkAuth();
    }, [segments]);

    if (!ready) return null;

    return children;
}

export default function RootLayout() {
    return (
        <SafeAreaProvider>
            <ThemeProvider>
                <AuthGate>
                    <StatusBar style="auto" />
                    <Stack screenOptions={{ headerShown: false }} />
                </AuthGate>
            </ThemeProvider>
        </SafeAreaProvider>
    );
}
