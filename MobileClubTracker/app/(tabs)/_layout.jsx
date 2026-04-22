import React, { useEffect, useState } from "react";
import { useColorScheme } from "react-native";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../constants/Colors";
import { isManager, isAdmin } from "../../utils/auth";

export default function TabLayout() {
    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme] ?? Colors.light;

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