import React from "react";
import { View, useColorScheme } from "react-native"; // ← add this
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../constants/Colors"; // ← add this

export default function TabLayout() {
    // Read the current color scheme just like any other component
    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme] ?? Colors.light;

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarStyle: { backgroundColor: theme.navBackground, 
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
                    tabBarIcon: ({ color }) => ( // ← use color prop so icon follows active/inactive tint
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
                    title: "Profile", tabBarIcon: ({ focused }) => (
                        <Ionicons
                            size={24}
                            name={focused ? 'person' : 'person-outline'}
                            color={focused ? theme.iconColorFocused : theme.iconColor}
                        />
                    )
                }}
            />
        </Tabs>
    );
}