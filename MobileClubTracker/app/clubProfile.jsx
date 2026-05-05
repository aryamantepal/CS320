import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    ScrollView,
    Image,
    Pressable,
    StyleSheet,
    Dimensions,
    ActivityIndicator,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import ThemedView from "../components/ThemedView";
import ThemedCard from "../components/ThemedCard";
import { apiFetch, getFollowedOrgIds, followOrg, unfollowOrg } from "../utils/auth";
import { addEventToCalendar } from "../utils/calendar";
import { useTheme } from "../context/ThemeContext";

const SCREEN_WIDTH = Dimensions.get("window").width;
const BANNER_HEIGHT = 160;
const AVATAR_SIZE = 90;

// Public viewer for a club. All manager-only actions live in yourClub.jsx.
export default function ClubPage() {
    const router = useRouter();
    const { theme } = useTheme();

    const params = useLocalSearchParams();
    // Guard against missing/garbage `id` params — without this, fetches go to
    // /orgs/NaN and the screen sits in an inconsistent state.
    const orgId = parseInt(String(params.id ?? ""), 10);
    const orgIdValid = Number.isFinite(orgId);
    const name = typeof params.name === "string" ? params.name : "";

    const [posts, setPosts] = useState([]);
    const [isFollowing, setIsFollowing] = useState(false);
    const [followerCount, setFollowerCount] = useState(0);
    const [description, setDescription] = useState("");
    const [imageUrl, setImageUrl] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!orgIdValid) {
            setLoading(false);
            return;
        }
        const loadData = async () => {
            try {
                const [postsRes, followedIds, orgRes] = await Promise.all([
                    apiFetch(`/orgs/${orgId}/posts`),
                    getFollowedOrgIds(),
                    apiFetch(`/orgs/${orgId}`),
                ]);
                const postsData = await postsRes.json();
                const orgData = await orgRes.json();

                setPosts(Array.isArray(postsData) ? postsData : []);
                setIsFollowing(Array.isArray(followedIds) && followedIds.includes(orgId));
                setFollowerCount(orgData._count?.followers ?? 0);
                setDescription(orgData.description ?? "");
                setImageUrl(orgData.imageUrl ?? null);
            } catch (err) {
                console.error("Failed to load club data:", err);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [orgId, orgIdValid]);

    const handleFollowToggle = async () => {
        // Optimistic state, but we revert if the server rejects.
        const wasFollowing = isFollowing;
        setIsFollowing(!wasFollowing);
        setFollowerCount((c) => wasFollowing ? Math.max(0, c - 1) : c + 1);
        try {
            if (wasFollowing) await unfollowOrg(orgId);
            else await followOrg(orgId);
        } catch (err) {
            console.error("Follow toggle failed:", err);
            // Revert
            setIsFollowing(wasFollowing);
            setFollowerCount((c) => wasFollowing ? c + 1 : Math.max(0, c - 1));
        }
    };

    if (!orgIdValid) {
        return (
            <ThemedView safe={true} style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 24 }}>
                <Text style={{ color: theme.text, fontSize: 16, textAlign: "center" }}>
                    This club link is invalid.
                </Text>
                <Pressable style={{ marginTop: 16 }} onPress={() => router.back()}>
                    <Text style={{ color: "#007AFF", fontSize: 15, fontWeight: "600" }}>‹ Go back</Text>
                </Pressable>
            </ThemedView>
        );
    }

    if (loading) {
        return (
            <ThemedView safe={true} style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
                <ActivityIndicator size="large" />
            </ThemedView>
        );
    }

    return (
        <ThemedView safe={true} style={{ flex: 1 }}>
            <ScrollView
                style={{ backgroundColor: "transparent" }}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.headerContainer}>
                    <Image
                        source={imageUrl ? { uri: imageUrl } : require("../assets/adaptive-icon.png")}
                        style={styles.banner}
                        resizeMode="cover"
                    />
                    <Pressable style={styles.backButton} onPress={() => router.back()}>
                        <Text style={styles.backButtonText}>‹</Text>
                    </Pressable>
                    <View style={styles.avatarWrapper}>
                        <Image
                            source={imageUrl ? { uri: imageUrl } : require("../assets/adaptive-icon.png")}
                            style={[styles.avatar, { borderColor: theme.background }]}
                        />
                    </View>
                </View>

                <View style={[styles.infoSection, { backgroundColor: theme.uiBackground }]}>
                    <View style={styles.nameRow}>
                        <Text style={[styles.name, { color: theme.text }]}>{name}</Text>
                        <Pressable
                            style={[
                                styles.followButton,
                                isFollowing
                                    ? { borderWidth: 1, borderColor: theme.iconColor }
                                    : { backgroundColor: "#007AFF" },
                            ]}
                            onPress={handleFollowToggle}
                        >
                            <Text style={[styles.followButtonText, { color: isFollowing ? theme.text : "#fff" }]}>
                                {isFollowing ? "Following" : "Follow"}
                            </Text>
                        </Pressable>
                    </View>
                    <Text style={[styles.meta, { color: theme.iconColor }]}>
                        {followerCount} {followerCount === 1 ? "follower" : "followers"}
                    </Text>
                    {description ? (
                        <Text style={[styles.description, { color: theme.text }]}>{description}</Text>
                    ) : null}
                </View>

                <View style={styles.sectionContainer}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>Posts</Text>
                    {posts.length === 0 ? (
                        <Text style={[styles.emptyText, { color: theme.iconColor }]}>No posts yet.</Text>
                    ) : (
                        posts.map((post) => (
                            <ThemedCard
                                key={`${post.type}-${post.id}`}
                                clubName={name}
                                title={post.title}
                                subtitle={
                                    post.type === "event"
                                        ? `📍 ${post.location} · ${new Date(post.startDateTime).toLocaleDateString()}`
                                        : post.body
                                }
                                bannerColor={post.color ?? undefined}
                                onPress={() =>
                                    router.push({
                                        pathname: "/postDetail",
                                        params: {
                                            type: post.type,
                                            title: post.title,
                                            body: post.body ?? "",
                                            location: post.location ?? "",
                                            startDateTime: post.startDateTime ? String(post.startDateTime) : "",
                                            clubName: name,
                                        },
                                    })
                                }
                                onAddToCalendar={
                                    post.type === "event"
                                        ? () =>
                                            addEventToCalendar({
                                                title: post.title,
                                                location: post.location,
                                                startDateTime: post.startDateTime,
                                                clubName: name,
                                            })
                                        : undefined
                                }
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
    infoSection: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16, marginBottom: 8 },
    nameRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
    name: { fontSize: 22, fontWeight: "700", flex: 1, marginRight: 12 },
    followButton: { borderRadius: 20, paddingVertical: 7, paddingHorizontal: 18 },
    followButtonText: { fontSize: 14, fontWeight: "600" },
    meta: { fontSize: 13, marginTop: 4, marginBottom: 4 },
    description: { fontSize: 14, marginTop: 8, lineHeight: 20 },
    sectionContainer: { paddingHorizontal: 16, marginBottom: 8 },
    sectionTitle: { fontSize: 17, fontWeight: "700", marginBottom: 10, marginTop: 8 },
    emptyText: { fontSize: 14, fontStyle: "italic" },
});
