import React, { useState } from "react";
import {
    View,
    Text,
    ScrollView,
    Image,
    Pressable,
    StyleSheet,
    useColorScheme,
    Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { Colors } from "../../constants/Colors";
import { logoutUser } from "../../utils/auth";
import { testUser } from "../../test/testInstances";

import ThemedView from "../../components/ThemedView.jsx";

const SCREEN_WIDTH = Dimensions.get("window").width;
const BANNER_HEIGHT = 140;
const AVATAR_SIZE = 90;

export default function Profile() {
    const router = useRouter();
    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme] ?? Colors.light;

    // We'll use testUser for now — replace with real fetched user later
    const user = testUser;
    const followedClubs = user.listFollowedClubs();

    const handleLogout = async () => {
        await logoutUser();
        router.replace("/(auth)/login");
    };

    return (
        <ThemedView style={{ backgroundColor: theme.background }} safe={true}>
            <ScrollView
                style={{ backgroundColor: theme.background }}
                contentContainerStyle={styles.scrollContent}
            >
                {/* ── HEADER: Banner + Avatar ── */}
                <View style={styles.headerContainer}>
                    {/* Banner */}
                    <Image
                        source={
                            user.banner
                                ? { uri: user.banner }
                                : require("../../assets/splash-icon.png") // fallback
                        }
                        style={styles.banner}
                        resizeMode="cover"
                    />

                    {/* Avatar — overlaps the banner using negative marginTop */}
                    <View style={styles.avatarWrapper}>
                        <Image
                            source={
                                user.profilePicture
                                    ? { uri: user.profilePicture }
                                    : require("../../assets/adaptive-icon.png")
                            }
                            style={[
                                styles.avatar,
                                { borderColor: theme.background }, // blends with page bg
                            ]}
                        />
                    </View>
                </View>

                {/* ── USER INFO ── */}
                <View style={[styles.infoSection, { backgroundColor: theme.uiBackground }]}>
                    <Text style={[styles.name, { color: theme.text }]}>
                        {user.name}
                    </Text>
                    <Text style={[styles.email, { color: theme.iconColor }]}>
                        {user.email ?? "No email set"} {/* add email to User later */}
                    </Text>

                    {/* Edit Profile Button */}
                    <Pressable
                        style={[styles.editButton, { borderColor: theme.iconColor }]}
                        onPress={() => { }} // hook up later
                    >
                        <Text style={[styles.editButtonText, { color: theme.text }]}>
                            Edit Profile
                        </Text>
                    </Pressable>
                </View>

                {/* ── FOLLOWED CLUBS ── */}
                <View style={styles.sectionContainer}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>
                        Followed Clubs
                    </Text>

                    {followedClubs.length === 0 ? (
                        <Text style={[styles.emptyText, { color: theme.iconColor }]}>
                            You haven't followed any clubs yet.
                        </Text>
                    ) : (
                        followedClubs.map((club, index) => (
                            <Pressable
                                key={index}
                                style={[styles.clubRow, { backgroundColor: theme.uiBackground }]}
                                onPress={() => { }} // navigate to club page later
                            >
                                {/* Club profile picture */}
                                <Image
                                    source={
                                        club.profilePicture
                                            ? { uri: club.profilePicture }
                                            : require("../../assets/adaptive-icon.png")
                                    }
                                    style={styles.clubAvatar}
                                />
                                <View style={styles.clubInfo}>
                                    <Text style={[styles.clubName, { color: theme.text }]}>
                                        {club.name}
                                    </Text>
                                    <Text style={[styles.clubMeta, { color: theme.iconColor }]}>
                                        {club.followers} followers · {club.posts.length} posts
                                    </Text>
                                </View>
                                {/* Arrow indicator */}
                                <Text style={{ color: theme.iconColor, fontSize: 18 }}>›</Text>
                            </Pressable>
                        ))
                    )}
                </View>

                {/* ── ACCOUNT SETTINGS ── */}
                <View style={styles.sectionContainer}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>
                        Account Settings
                    </Text>

                    {/* Each settings row */}
                    {[
                        { label: "Change Password", onPress: () => { } },
                        { label: "Notifications", onPress: () => { } },
                        { label: "Privacy", onPress: () => { } },
                    ].map((item, index) => (
                        <Pressable
                            key={index}
                            style={[styles.settingsRow, { backgroundColor: theme.uiBackground }]}
                            onPress={item.onPress}
                        >
                            <Text style={[styles.settingsLabel, { color: theme.text }]}>
                                {item.label}
                            </Text>
                            <Text style={{ color: theme.iconColor, fontSize: 18 }}>›</Text>
                        </Pressable>
                    ))}

                    {/* Logout — separate because it's destructive */}
                    <Pressable
                        style={[styles.settingsRow, { backgroundColor: theme.uiBackground }]}
                        onPress={handleLogout}
                    >
                        <Text style={[styles.settingsLabel, { color: "tomato" }]}>
                            Log Out
                        </Text>
                    </Pressable>
                </View>
            </ScrollView>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    scrollContent: {
        paddingBottom: 40,
    },

    // Header
    headerContainer: {
        marginBottom: AVATAR_SIZE / 2, // makes room for avatar overlap
    },
    banner: {
        width: SCREEN_WIDTH,
        height: BANNER_HEIGHT,
    },
    avatarWrapper: {
        position: "absolute",
        bottom: -(AVATAR_SIZE / 2), // pulls avatar halfway below banner
        left: 16,
    },
    avatar: {
        width: AVATAR_SIZE,
        height: AVATAR_SIZE,
        borderRadius: AVATAR_SIZE / 2,
        borderWidth: 4, // white ring like LinkedIn
    },

    // Info section
    infoSection: {
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 16,
        marginBottom: 8,
    },
    name: {
        fontSize: 22,
        fontWeight: "700",
        marginBottom: 2,
    },
    email: {
        fontSize: 14,
        marginBottom: 12,
    },
    editButton: {
        alignSelf: "flex-start",
        borderWidth: 1,
        borderRadius: 20,
        paddingVertical: 6,
        paddingHorizontal: 16,
    },
    editButtonText: {
        fontSize: 14,
        fontWeight: "500",
    },

    // Shared section
    sectionContainer: {
        marginBottom: 8,
        paddingHorizontal: 16,
    },
    sectionTitle: {
        fontSize: 17,
        fontWeight: "700",
        marginBottom: 10,
        marginTop: 8,
    },
    emptyText: {
        fontSize: 14,
        fontStyle: "italic",
    },

    // Club rows
    clubRow: {
        flexDirection: "row",
        alignItems: "center",
        padding: 12,
        borderRadius: 12,
        marginBottom: 8,
    },
    clubAvatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        marginRight: 12,
        backgroundColor: "#ccc",
    },
    clubInfo: {
        flex: 1,
    },
    clubName: {
        fontSize: 15,
        fontWeight: "600",
    },
    clubMeta: {
        fontSize: 12,
        marginTop: 2,
    },

    // Settings rows
    settingsRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 14,
        borderRadius: 12,
        marginBottom: 8,
    },
    settingsLabel: {
        fontSize: 15,
    },
});