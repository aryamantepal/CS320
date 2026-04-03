// app/club.jsx
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
import { useRouter, useLocalSearchParams } from "expo-router";
import { Colors } from "../constants/Colors";
import { 
    testUser,
    testClub,
    testClub2,
    testClub3
 } from "../test/testInstances";
import ThemedView from "../components/ThemedView";
import ThemedCard from "../components/ThemedCard";

const SCREEN_WIDTH = Dimensions.get("window").width;
const BANNER_HEIGHT = 160;
const AVATAR_SIZE = 90;

export default function ClubPage() {
    const router = useRouter();
    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme] ?? Colors.light;

    const user = testUser;

    const { name } = useLocalSearchParams(); // reads "name" from the route params
    // Find the club whose name matches the param
    const allClubs = [testClub, testClub2, testClub3];
    const club = allClubs.find(c => c.name === name);

    // Check if the current user already follows this club.
    // This drives the button label and color.
    const [isFollowing, setIsFollowing] = useState(
        user.listFollowedClubs().includes(club)
    );

    // Guard: if no club found, show a fallback
    if (!club) {
        return (
            <ThemedView safe={true} style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
                <Text style={{ color: theme.text }}>Club not found.</Text>
                <Pressable onPress={() => router.back()}>
                    <Text style={{ color: "#007AFF", marginTop: 12 }}>Go Back</Text>
                </Pressable>
            </ThemedView>
        );
    }

    const handleFollowToggle = () => {
        if (isFollowing) {
            user.unfollowClub(club); // calls club.unfollow() internally
        } else {
            user.followClub(club);   // calls club.follow() internally
        }
        setIsFollowing(!isFollowing);
    };

    const posts = club.listAllPosts();

    return (
        <ThemedView safe={true} style={{ flex: 1 }}>
            <ScrollView
                style={{ backgroundColor: "transparent" }}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* ── HEADER: Banner + Avatar ── */}
                <View style={styles.headerContainer}>
                    <Image
                        source={
                            club.banner
                                ? { uri: club.banner }
                                : require("../assets/adaptive-icon.png")
                        }
                        style={styles.banner}
                        resizeMode="cover"
                    />

                    {/* Back button — sits on top of the banner */}
                    <Pressable
                        style={styles.backButton}
                        onPress={() => router.back()}
                    >
                        <Text style={styles.backButtonText}>‹</Text>
                    </Pressable>

                    <View style={styles.avatarWrapper}>
                        <Image
                            source={
                                club.profilePicture
                                    ? { uri: club.profilePicture }
                                    : require("../assets/adaptive-icon.png")
                            }
                            style={[styles.avatar, { borderColor: theme.background }]}
                        />
                    </View>
                </View>

                {/* ── CLUB INFO ── */}
                <View style={[styles.infoSection, { backgroundColor: theme.uiBackground }]}>
                    {/* Name + Follow button on the same row */}
                    <View style={styles.nameRow}>
                        <Text style={[styles.name, { color: theme.text }]}>
                            {club.name}
                        </Text>

                        {/*
                            The follow button changes appearance based on isFollowing.
                            When following: outlined style (like LinkedIn's "Following")
                            When not following: filled blue style (like "Follow")
                        */}
                        <Pressable
                            style={[
                                styles.followButton,
                                isFollowing
                                    ? { borderWidth: 1, borderColor: theme.iconColor }
                                    : { backgroundColor: "#007AFF" }
                            ]}
                            onPress={handleFollowToggle}
                        >
                            <Text style={[
                                styles.followButtonText,
                                { color: isFollowing ? theme.text : "#fff" }
                            ]}>
                                {isFollowing ? "Following" : "Follow"}
                            </Text>
                        </Pressable>
                    </View>

                    {/* Follower count */}
                    <Text style={[styles.meta, { color: theme.iconColor }]}>
                        {club.followers} followers
                    </Text>

                    {/* Description */}
                    {club.description && (
                        <Text style={[styles.description, { color: theme.text }]}>
                            {club.description}
                        </Text>
                    )}

                    {/* Tags */}
                    {club.tags && club.tags.length > 0 && (
                        <View style={styles.tagsRow}>
                            {club.tags.map((tag, index) => (
                                <View
                                    key={index}
                                    style={[styles.tag, { backgroundColor: theme.background }]}
                                >
                                    <Text style={[styles.tagText, { color: theme.iconColor }]}>
                                        #{tag}
                                    </Text>
                                </View>
                            ))}
                        </View>
                    )}
                </View>

                {/* ── POSTS ── */}
                <View style={styles.sectionContainer}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>
                        Posts
                    </Text>

                    {posts.length === 0 ? (
                        <Text style={[styles.emptyText, { color: theme.iconColor }]}>
                            No posts yet.
                        </Text>
                    ) : (
                        posts.map((post, index) => (
                            <ThemedCard
                                key={index}
                                image={club.profilePicture}
                                clubName={club.name}
                                title={post.name}
                                subtitle={
                                    post.type === "event"
                                        ? post.description
                                        : post.content
                                }
                                onPress={() => console.log("Post tapped:", post.name)}
                            />
                        ))
                    )}
                </View>
            </ScrollView>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    scrollContent: { paddingBottom: 120 },

    // Header
    headerContainer: { marginBottom: AVATAR_SIZE / 2 },
    banner: { width: SCREEN_WIDTH, height: BANNER_HEIGHT },
    backButton: {
        position: "absolute",
        top: 16,
        left: 16,
        backgroundColor: "rgba(0,0,0,0.4)",
        borderRadius: 20,
        width: 36,
        height: 36,
        alignItems: "center",
        justifyContent: "center",
    },
    backButtonText: { color: "#fff", fontSize: 24, lineHeight: 28 },
    avatarWrapper: { position: "absolute", bottom: -(AVATAR_SIZE / 2), left: 16 },
    avatar: { width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE / 2, borderWidth: 4 },

    // Info
    infoSection: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16, marginBottom: 8 },
    nameRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
    name: { fontSize: 22, fontWeight: "700", flex: 1, marginRight: 12 },
    followButton: { borderRadius: 20, paddingVertical: 7, paddingHorizontal: 18 },
    followButtonText: { fontSize: 14, fontWeight: "600" },
    meta: { fontSize: 13, marginBottom: 8 },
    description: { fontSize: 14, lineHeight: 20, marginBottom: 10 },
    tagsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
    tag: { borderRadius: 12, paddingVertical: 4, paddingHorizontal: 10 },
    tagText: { fontSize: 12 },

    // Posts
    sectionContainer: { paddingHorizontal: 16, marginBottom: 8 },
    sectionTitle: { fontSize: 17, fontWeight: "700", marginBottom: 10, marginTop: 8 },
    emptyText: { fontSize: 14, fontStyle: "italic", color: "gray" },
});