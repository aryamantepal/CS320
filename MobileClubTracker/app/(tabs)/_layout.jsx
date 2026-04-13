import React, { useEffect, useState } from "react";
import { useColorScheme } from "react-native";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../constants/Colors";
// CHANGED: import isManager helper to conditionally show the Your Club tab
import { isManager } from "../../utils/auth";

export default function TabLayout() {
    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme] ?? Colors.light;

    // CHANGED: track whether the logged-in user is a manager
    const [managerMode, setManagerMode] = useState(false);

    useEffect(() => {
        const checkRole = async () => {
            const manager = await isManager();
            setManagerMode(manager);
        };
        checkRole();
    }, []);

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: theme.navBackground,
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
            {/* CHANGED: only show Your Club tab if the user is a manager */}
            <Tabs.Screen
                name="yourClub"
                options={{
                    title: "Your Club",
                    href: managerMode ? undefined : null, // null hides it from the tab bar
                    tabBarIcon: ({ color }) => (
                        <Ionicons name="shield" size={30} color={color} />
                    ),
                }}
            />
        </Tabs>
    );
}