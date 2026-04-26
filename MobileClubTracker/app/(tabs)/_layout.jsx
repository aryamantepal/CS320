import React, { useEffect, useState } from "react";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../constants/Colors";
// CHANGED: import isManager helper to conditionally show the Your Club tab
import { isManager, isAdmin } from "../../utils/auth";
import { useTheme } from "../../context/ThemeContext";

export default function TabLayout() {
    const themeContext = useTheme();
    const theme = themeContext?.theme;
    if (!theme) return null;
    
    // CHANGED: track whether the logged-in user is a manager
    const [managerMode, setManagerMode] = useState(false);
    const [adminMode, setAdminMode] = useState(false);

    useEffect(() => {
        const checkRole = async () => {
            const [manager, admin] = await Promise.all([isManager(), isAdmin()]);
            setManagerMode(manager);
            setAdminMode(admin);
        };
        checkRole();
    }, []);

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