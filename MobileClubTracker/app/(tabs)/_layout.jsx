import React, { useEffect, useState } from "react";
import { Tabs, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useCallback } from "react";
import { isManager, isAdmin, refreshUser } from "../../utils/auth";
import { useTheme } from "../../context/ThemeContext";

export default function TabLayout() {
    // IMPORTANT: all hooks must run in the same order on every render.
    // The previous version did `if (!theme) return null;` *before* the
    // useState/useEffect hooks below, which violates the Rules of Hooks
    // and can crash the tab bar with "Rendered more hooks than during
    // the previous render". `useTheme()` already throws if there's no
    // provider, so the early return is unnecessary.
    const { theme } = useTheme();

    const [managerMode, setManagerMode] = useState(false);
    const [adminMode, setAdminMode] = useState(false);

    const recomputeRoles = useCallback(async () => {
        const [manager, admin] = await Promise.all([isManager(), isAdmin()]);
        setManagerMode(manager);
        setAdminMode(admin);
    }, []);

    useEffect(() => {
        recomputeRoles();
    }, [recomputeRoles]);

    // Re-pull roles whenever a tab regains focus, so the "Your Club" / "Admin"
    // tabs appear immediately after a refreshUser() call updates the cache
    // (e.g. an admin just promoted us to manager).
    useFocusEffect(
        useCallback(() => {
            (async () => {
                await refreshUser();
                await recomputeRoles();
            })();
        }, [recomputeRoles])
    );

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: theme.background,
                    paddingTop: 10,
                    height: 100,
                },
                tabBarActiveTintColor: theme.iconColorFocused,
                tabBarInactiveTintColor: theme.iconColor,
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: "Home",
                    tabBarIcon: ({ color }) => (
                        <Ionicons name="home" size={30} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="explore"
                options={{
                    title: "Explore",
                    tabBarIcon: ({ color }) => (
                        <Ionicons name="search" size={30} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: "Profile",
                    tabBarIcon: ({ focused }) => (
                        <Ionicons
                            size={24}
                            name={focused ? "person" : "person-outline"}
                            color={focused ? theme.iconColorFocused : theme.iconColor}
                        />
                    ),
                }}
            />
            <Tabs.Screen
                name="yourClub"
                options={{
                    title: "Your Club",
                    href: managerMode ? undefined : null,
                    tabBarIcon: ({ color }) => (
                        <Ionicons name="shield" size={30} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="admin"
                options={{
                    title: "Admin",
                    href: adminMode ? undefined : null,
                    tabBarIcon: ({ color }) => (
                        <Ionicons name="key" size={28} color={color} />
                    ),
                }}
            />
        </Tabs>
    );
}
