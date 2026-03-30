import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect, useState } from "react";
import { getUser } from "../utils/auth";

export default function RootLayout() {
    const router = useRouter();
    const segments = useSegments();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkAuth = async () => {
            const user = await getUser();
            const inAuthGroup = segments[0] === "(auth)";

            if (!user && !inAuthGroup) {
                router.replace("/login");
            }

            if (user && inAuthGroup) {
                router.replace("/(tabs)");
            }

            setLoading(false);
        };

        checkAuth();
    }, []);

    if (loading) return null;

    return <Stack screenOptions={{ headerShown: false }} />;
}