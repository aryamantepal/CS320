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
    TextInput,
    Modal,
    // CHANGED: added KeyboardAvoidingView and Platform for the create post modal
    KeyboardAvoidingView,
    Platform,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Colors } from "../../constants/Colors";
import ThemedView from "../../components/ThemedView";
import ThemedCard from "../../components/ThemedCard";
// CHANGED: import getManagedOrg to check if this club belongs to the logged-in manager
import { API_URL, getUserId, getManagedOrg } from "../../utils/auth";

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
    const [followerCount, setFollowerCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [userId, setUserId] = useState(null);

    // CHANGED: track whether the logged-in user manages THIS club
    const [isMyClub, setIsMyClub] = useState(false);

    // CHANGED: modal state — which modal is open: null | "event" | "announcement"
    const [modalType, setModalType] = useState(null);

    // CHANGED: form fields for creating a post
    const [postTitle, setPostTitle] = useState("");
    const [postBody, setPostBody] = useState("");       // used for announcement body
    const [postLocation, setPostLocation] = useState(""); // used for event location
    const [postDate, setPostDate] = useState("");         // used for event date (YYYY-MM-DD)
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        const loadData = async () => {
            const uid = await getUserId();
            setUserId(uid);

            // CHANGED: check if the logged-in manager owns this club
            const managedOrg = await getManagedOrg();
            if (managedOrg && managedOrg.id === orgId) {
                setIsMyClub(true);
            }

            try {
                const [postsRes, followsRes, orgRes] = await Promise.all([
                    fetch(`${API_URL}/orgs/${orgId}/posts`),
                    fetch(`${API_URL}/follows/${uid}`),
                    fetch(`${API_URL}/orgs/${orgId}`),
                ]);
                const postsData = await postsRes.json();
                const followedOrgIds = await followsRes.json();
                const orgData = await orgRes.json();
                setPosts(Array.isArray(postsData) ? postsData : []);
                setIsFollowing(Array.isArray(followedOrgIds) && followedOrgIds.includes(orgId));
                setFollowerCount(orgData._count?.followers ?? 0);
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
            setFollowerCount((c) => isFollowing ? c - 1 : c + 1);
        } catch (err) {
            console.error("Follow toggle failed:", err);
        }
    };

    // CHANGED: handles submitting a new event or announcement to the backend
    const handleSubmitPost = async () => {
        if (!postTitle.trim()) return alert("Title is required");

        setSubmitting(true);
        try {
            if (modalType === "event") {
                if (!postLocation.trim()) return alert("Location is required");
                if (!postDate.trim()) return alert("Date is required");
                await fetch(`${API_URL}/orgs/${orgId}/events`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        title: postTitle,
                        location: postLocation,
                        startDateTime: new Date(postDate).toISOString(),
                    }),
                });
            } else {
                if (!postBody.trim()) return alert("Body is required");
                await fetch(`${API_URL}/orgs/${orgId}/announcements`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ title: postTitle, body: postBody }),
                });
            }

            // Refresh posts after creating
            const res = await fetch(`${API_URL}/orgs/${orgId}/posts`);
            const data = await res.json();
            setPosts(Array.isArray(data) ? data : []);

            // Reset and close modal
            setPostTitle("");
            setPostBody("");
            setPostLocation("");
            setPostDate("");
            setModalType(null);
        } catch (err) {
            console.error("Failed to create post:", err);
            alert("Something went wrong. Try again.");
        } finally {
            setSubmitting(false);
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
                        source={require("../../assets/adaptive-icon.png")}
                        style={styles.banner}
                        resizeMode="cover"
                    />

                    <Pressable style={styles.backButton} onPress={() => router.back()}>
                        <Text style={styles.backButtonText}>‹</Text>
                    </Pressable>

                    <View style={styles.avatarWrapper}>
                        <Image
                            source={require("../../assets/adaptive-icon.png")}
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
                    <Text style={[styles.meta, { color: theme.iconColor }]}>
                        {followerCount} {followerCount === 1 ? "follower" : "followers"}
                    </Text>
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

            {/* CHANGED: floating manager buttons — only visible if this is the manager's club */}
            {isMyClub && (
                <View style={styles.fabContainer}>
                    <Pressable
                        style={[styles.fab, { backgroundColor: "#34C759" }]}
                        onPress={() => setModalType("announcement")}
                    >
                        <Text style={styles.fabText}>+ Announcement</Text>
                    </Pressable>
                    <Pressable
                        style={[styles.fab, { backgroundColor: "#007AFF" }]}
                        onPress={() => setModalType("event")}
                    >
                        <Text style={styles.fabText}>+ Event</Text>
                    </Pressable>
                </View>
            )}

            {/* CHANGED: modal for creating an event or announcement */}
            <Modal
                visible={modalType !== null}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setModalType(null)}
            >
                <KeyboardAvoidingView
                    style={styles.modalOverlay}
                    behavior={Platform.OS === "ios" ? "padding" : undefined}
                >
                    <View style={[styles.modalBox, { backgroundColor: theme.uiBackground }]}>
                        <Text style={[styles.modalTitle, { color: theme.text }]}>
                            {modalType === "event" ? "New Event" : "New Announcement"}
                        </Text>

                        <TextInput
                            placeholder="Title"
                            placeholderTextColor={theme.iconColor}
                            value={postTitle}
                            onChangeText={setPostTitle}
                            style={[styles.input, { borderColor: theme.iconColor, color: theme.text }]}
                        />

                        {modalType === "event" ? (
                            <>
                                <TextInput
                                    placeholder="Location"
                                    placeholderTextColor={theme.iconColor}
                                    value={postLocation}
                                    onChangeText={setPostLocation}
                                    style={[styles.input, { borderColor: theme.iconColor, color: theme.text }]}
                                />
                                <TextInput
                                    placeholder="Date (YYYY-MM-DD)"
                                    placeholderTextColor={theme.iconColor}
                                    value={postDate}
                                    onChangeText={setPostDate}
                                    style={[styles.input, { borderColor: theme.iconColor, color: theme.text }]}
                                />
                            </>
                        ) : (
                            <TextInput
                                placeholder="Body"
                                placeholderTextColor={theme.iconColor}
                                value={postBody}
                                onChangeText={setPostBody}
                                multiline
                                numberOfLines={4}
                                style={[styles.input, styles.textArea, { borderColor: theme.iconColor, color: theme.text }]}
                            />
                        )}

                        <View style={styles.modalButtons}>
                            <Pressable
                                style={[styles.modalBtn, { borderColor: theme.iconColor, borderWidth: 1 }]}
                                onPress={() => setModalType(null)}
                            >
                                <Text style={{ color: theme.text }}>Cancel</Text>
                            </Pressable>
                            <Pressable
                                style={[styles.modalBtn, { backgroundColor: "#007AFF" }]}
                                onPress={handleSubmitPost}
                                disabled={submitting}
                            >
                                <Text style={{ color: "#fff", fontWeight: "600" }}>
                                    {submitting ? "Posting..." : "Post"}
                                </Text>
                            </Pressable>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
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
    sectionContainer: { paddingHorizontal: 16, marginBottom: 8 },
    sectionTitle: { fontSize: 17, fontWeight: "700", marginBottom: 10, marginTop: 8 },
    emptyText: { fontSize: 14, fontStyle: "italic" },

    // CHANGED: styles for the floating action buttons
    fabContainer: {
        position: "absolute",
        bottom: 30,
        right: 16,
        gap: 10,
        alignItems: "flex-end",
    },
    fab: {
        borderRadius: 24,
        paddingVertical: 12,
        paddingHorizontal: 20,
        shadowColor: "#000",
        shadowOpacity: 0.2,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 3 },
        elevation: 5,
    },
    fabText: { color: "#fff", fontWeight: "700", fontSize: 14 },

    // CHANGED: styles for the create post modal
    modalOverlay: {
        flex: 1,
        justifyContent: "flex-end",
        backgroundColor: "rgba(0,0,0,0.4)",
    },
    modalBox: {
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 24,
        gap: 12,
    },
    modalTitle: { fontSize: 20, fontWeight: "700", marginBottom: 8 },
    input: {
        borderWidth: 1,
        borderRadius: 10,
        padding: 12,
        fontSize: 15,
    },
    textArea: { height: 100, textAlignVertical: "top" },
    modalButtons: { flexDirection: "row", justifyContent: "flex-end", gap: 10, marginTop: 8 },
    modalBtn: { borderRadius: 10, paddingVertical: 10, paddingHorizontal: 20 },
});