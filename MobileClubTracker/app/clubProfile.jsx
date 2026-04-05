import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    ScrollView,
    Image,
    Pressable,
    StyleSheet,
    useColorScheme,
    Dimensions,
    ActivityIndicator,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Colors } from "../constants/Colors";
import ThemedView from "../components/ThemedView";
import ThemedCard from "../components/ThemedCard";
import { API_URL, getUserId } from "../utils/auth";

const SCREEN_WIDTH = Dimensions.get("window").width;
const BANNER_HEIGHT = 160;
const AVATAR_SIZE = 90;

export default function ClubPage() {
    const router = useRouter();
    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme] ?? Colors.light;

    const { id, name } = useLocalSearchParams();
    const orgId = parseInt(id);

    const [posts, setPosts] = useState([]);
    const [isFollowing, setIsFollowing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [userId, setUserId] = useState(null);

    useEffect(() => {
        const loadData = async () => {
            const uid = await getUserId();
            setUserId(uid);

            try {
                const [postsRes, followsRes] = await Promise.all([
                    fetch(`${API_URL}/orgs/${orgId}/posts`),
                    fetch(`${API_URL}/follows/${uid}`),
                ]);
                const postsData = await postsRes.json();
                const followedOrgIds = await followsRes.json();
                setPosts(postsData);
                setIsFollowing(followedOrgIds.includes(orgId));
            } catch (err) {
                console.error("Failed to load club data:", err);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [orgId]);

    const handleFollowToggle = async () => {
        try {
            if (isFollowing) {
                await fetch(`${API_URL}/follow`, {
                    method: "DELETE",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ userId, organizationId: orgId }),
                });
            } else {
                await fetch(`${API_URL}/follow`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ userId, organizationId: orgId }),
                });
            }
            setIsFollowing(!isFollowing);
        } catch (err) {
            console.error("Follow toggle failed:", err);
        }
    };

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
                {/* ── HEADER: Banner + Avatar ── */}
                <View style={styles.headerContainer}>
                    <Image
                        source={require("../assets/adaptive-icon.png")}
                        style={styles.banner}
                        resizeMode="cover"
                    />

                    <Pressable style={styles.backButton} onPress={() => router.back()}>
                        <Text style={styles.backButtonText}>‹</Text>
                    </Pressable>

                    <View style={styles.avatarWrapper}>
                        <Image
                            source={require("../assets/adaptive-icon.png")}
                            style={[styles.avatar, { borderColor: theme.background }]}
                        />
                    </View>
                </View>

                {/* ── CLUB INFO ── */}
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
                </View>

                {/* ── POSTS ── */}
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
                                onPress={() => {}}
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
    sectionContainer: { paddingHorizontal: 16, marginBottom: 8 },
    sectionTitle: { fontSize: 17, fontWeight: "700", marginBottom: 10, marginTop: 8 },
    emptyText: { fontSize: 14, fontStyle: "italic" },
});
