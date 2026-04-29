// CHANGED: yourClub.jsx is now the full manager dashboard —
// edit club name, description, image URL, and create events/announcements
import React, { useState, useCallback } from "react";
import {
    View,
    Text,
    ScrollView,
    Image,
    Pressable,
    StyleSheet,
    Dimensions,
    ActivityIndicator,
    TextInput,
    Modal,
    KeyboardAvoidingView,
    Platform,
    Alert,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { Colors } from "../../constants/Colors";
import { getManagedOrg, API_URL } from "../../utils/auth";
import ThemedView from "../../components/ThemedView";
import ThemedCard from "../../components/ThemedCard";
import { useTheme } from '../../context/ThemeContext';
import { pickAndUploadImage } from "../../utils/uploadImage";
const SCREEN_WIDTH = Dimensions.get("window").width;
const BANNER_HEIGHT = 160;
const AVATAR_SIZE = 90;

export default function YourClub() {
     const { theme } = useTheme();

    const [org, setOrg] = useState(null);
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);

    // ── Edit club info state ──
    const [editName, setEditName] = useState("");
    const [editDescription, setEditDescription] = useState("");
    const [editImageUrl, setEditImageUrl] = useState("");
    const [uploadingImage, setUploadingImage] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [savingInfo, setSavingInfo] = useState(false);

    // ── Create post state ──
    const [modalType, setModalType] = useState(null); // null | "event" | "announcement"
    const [postTitle, setPostTitle] = useState("");
    const [postBody, setPostBody] = useState("");
    const [postLocation, setPostLocation] = useState("");
    const [postDate, setPostDate] = useState("");
    const [submitting, setSubmitting] = useState(false);

    useFocusEffect(
        useCallback(() => {
            const loadClub = async () => {
                setLoading(true);
                try {
                    const managedOrg = await getManagedOrg();
                    if (!managedOrg) { setLoading(false); return; }

                    const [orgRes, postsRes] = await Promise.all([
                        fetch(`${API_URL}/orgs/${managedOrg.id}`),
                        fetch(`${API_URL}/orgs/${managedOrg.id}/posts`),
                    ]);
                    const orgData = await orgRes.json();
                    const postsData = await postsRes.json();

                    setOrg(orgData);
                    setEditName(orgData.name ?? "");
                    setEditDescription(orgData.description ?? "");
                    setEditImageUrl(orgData.imageUrl ?? "");
                    setPosts(Array.isArray(postsData) ? postsData : []);
                } catch (err) {
                    console.error("Failed to load managed club:", err);
                } finally {
                    setLoading(false);
                }
            };
            loadClub();
        }, [])
    );

    const handlePickClubImage = async () => {
        setUploadingImage(true);
        try {
            const url = await pickAndUploadImage("club-images", `orgs/${org.id}.jpg`);
            if (url) setEditImageUrl(url);
        } catch (err) {
            Alert.alert("Error", err.message ?? "Could not upload image.");
        } finally {
            setUploadingImage(false);
        }
    };

    // Save club name, description, and image URL
    const handleSaveClubInfo = async () => {
        if (!editName.trim()) return Alert.alert("Error", "Club name cannot be empty");
        setSavingInfo(true);
        try {
            await fetch(`${API_URL}/orgs/${org.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: editName.trim(),
                    description: editDescription.trim(),
                    imageUrl: editImageUrl.trim() || null,
                }),
            });
            // Refresh org data
            const res = await fetch(`${API_URL}/orgs/${org.id}`);
            const updated = await res.json();
            setOrg(updated);
            setShowEditModal(false);
            Alert.alert("Saved!", "Club info updated successfully.");
        } catch (err) {
            console.error("Failed to save club info:", err);
            Alert.alert("Error", "Could not save. Try again.");
        } finally {
            setSavingInfo(false);
        }
    };

    // Submit a new event or announcement
    const handleSubmitPost = async () => {
        if (!postTitle.trim()) return Alert.alert("Error", "Title is required");
        setSubmitting(true);
        try {
            if (modalType === "event") {
                if (!postLocation.trim()) return Alert.alert("Error", "Location is required");
                if (!postDate.trim()) return Alert.alert("Error", "Date is required");
                await fetch(`${API_URL}/orgs/${org.id}/events`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        title: postTitle,
                        location: postLocation,
                        startDateTime: new Date(postDate).toISOString(),
                    }),
                });
            } else {
                if (!postBody.trim()) return Alert.alert("Error", "Body is required");
                await fetch(`${API_URL}/orgs/${org.id}/announcements`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ title: postTitle, body: postBody }),
                });
            }

            // Refresh posts
            const res = await fetch(`${API_URL}/orgs/${org.id}/posts`);
            const data = await res.json();
            setPosts(Array.isArray(data) ? data : []);

            // Reset form and close modal
            setPostTitle("");
            setPostBody("");
            setPostLocation("");
            setPostDate("");
            setModalType(null);
        } catch (err) {
            console.error("Failed to create post:", err);
            Alert.alert("Error", "Something went wrong. Try again.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeletePost = async (postType, postId) => {
        Alert.alert(
            "Delete Post",
            "Are you sure you want to delete this post? This cannot be undone.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            const endpoint =
                                postType === "event"
                                    ? `${API_URL}/events/${postId}`
                                    : `${API_URL}/announcements/${postId}`;
                            const res = await fetch(endpoint, { method: "DELETE" });
                            if (!res.ok) throw new Error("Delete failed");
                            // Remove from local state immediately — no need to re-fetch
                            setPosts((prev) =>
                                prev.filter((p) => !(p.id === postId && p.type === postType))
                            );
                        } catch (err) {
                            Alert.alert("Error", "Could not delete post. Try again.");
                        }
                    },
                },
            ]
        );
    };

    if (loading) {
        return (
            <ThemedView safe={true} style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
                <ActivityIndicator size="large" />
            </ThemedView>
        );
    }

    if (!org) {
        return (
            <ThemedView safe={true} style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 24 }}>
                <Text style={{ color: theme.text, fontSize: 16, textAlign: "center" }}>
                    You are not managing any club.
                </Text>
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
                        source={org.imageUrl ? { uri: org.imageUrl } : require("../../assets/adaptive-icon.png")}
                        style={styles.banner}
                        resizeMode="cover"
                    />
                    <View style={styles.avatarWrapper}>
                        <Image
                            source={org.imageUrl ? { uri: org.imageUrl } : require("../../assets/adaptive-icon.png")}
                            style={[styles.avatar, { borderColor: theme.background }]}
                        />
                    </View>
                </View>

                {/* ── CLUB INFO ── */}
                <View style={[styles.infoSection, { backgroundColor: theme.background }]}>
                    <View style={styles.nameRow}>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.clubName, { color: theme.text }]}>{org.name}</Text>
                            <Text style={[styles.meta, { color: theme.iconColor }]}>
                                {org._count?.followers ?? 0} followers
                            </Text>
                        </View>
                        {/* Edit club info button */}
                        <Pressable
                            style={[styles.editButton, { borderColor: theme.iconColor }]}
                            onPress={() => setShowEditModal(true)}
                        >
                            <Text style={{ color: theme.text, fontSize: 13, fontWeight: "600" }}>✏️ Edit</Text>
                        </Pressable>
                    </View>
                    {org.description ? (
                        <Text style={[styles.description, { color: theme.text }]}>{org.description}</Text>
                    ) : (
                        <Text style={[styles.description, { color: theme.iconColor, fontStyle: "italic" }]}>
                            No description yet. Tap Edit to add one.
                        </Text>
                    )}
                </View>

                {/* ── CREATE POST BUTTONS ── */}
                <View style={styles.actionsRow}>
                    <Pressable
                        style={[styles.actionBtn, { backgroundColor: "#007AFF" }]}
                        onPress={() => setModalType("event")}
                    >
                        <Text style={styles.actionBtnText}>+ Event</Text>
                    </Pressable>
                    <Pressable
                        style={[styles.actionBtn, { backgroundColor: "#34C759" }]}
                        onPress={() => setModalType("announcement")}
                    >
                        <Text style={styles.actionBtnText}>+ Announcement</Text>
                    </Pressable>
                </View>

                {/* ── POSTS ── */}
                <View style={styles.postsSection}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>Your Posts</Text>
                    {posts.length === 0 ? (
                        <Text style={[styles.emptyText, { color: theme.iconColor }]}>
                            No posts yet. Create your first event or announcement above!
                        </Text>
                    ) : (
                        posts.map((post) => (
                            <ThemedCard
                                key={`${post.type}-${post.id}`}
                                image={org.imageUrl}
                                clubName={org.name}
                                title={post.title}
                                subtitle={
                                    post.type === "event"
                                        ? `📍 ${post.location} · ${new Date(post.startDateTime).toLocaleDateString()}`
                                        : post.body
                                }
                                onPress={() => { }}   // managers viewing their own posts — no detail nav needed
                                onDelete={() => handleDeletePost(post.type, post.id)}
                            />
                        ))
                    )}
                </View>
            </ScrollView>

            {/* ── EDIT CLUB INFO MODAL ── */}
            <Modal
                visible={showEditModal}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowEditModal(false)}
            >
                <KeyboardAvoidingView
                    style={styles.modalOverlay}
                    behavior={Platform.OS === "ios" ? "padding" : undefined}
                >
                    <View style={[styles.modalBox, { backgroundColor: theme.uiBackground }]}>
                        <Text style={[styles.modalTitle, { color: theme.text }]}>Edit Club Info</Text>

                        <Text style={[styles.fieldLabel, { color: theme.iconColor }]}>Club Name</Text>
                        <TextInput
                            value={editName}
                            onChangeText={setEditName}
                            placeholder="Club Name"
                            placeholderTextColor={theme.iconColor}
                            style={[styles.input, { borderColor: theme.iconColor, color: theme.text }]}
                        />

                        <Text style={[styles.fieldLabel, { color: theme.iconColor }]}>Description</Text>
                        <TextInput
                            value={editDescription}
                            onChangeText={setEditDescription}
                            placeholder="Describe your club..."
                            placeholderTextColor={theme.iconColor}
                            multiline
                            numberOfLines={3}
                            style={[styles.input, styles.textArea, { borderColor: theme.iconColor, color: theme.text }]}
                        />

                        <Text style={[styles.fieldLabel, { color: theme.iconColor }]}>Club Photo</Text>
                        <Pressable style={styles.imagePickerBtn} onPress={handlePickClubImage} disabled={uploadingImage}>
                            {editImageUrl ? (
                                <Image source={{ uri: editImageUrl }} style={styles.imagePickerPreview} />
                            ) : (
                                <View style={[styles.imagePickerPlaceholder, { borderColor: theme.iconColor }]}>
                                    <Text style={{ color: theme.iconColor, fontSize: 13 }}>
                                        {uploadingImage ? "Uploading..." : "Tap to choose photo"}
                                    </Text>
                                </View>
                            )}
                            {editImageUrl ? (
                                <Text style={[styles.changePhotoLabel, { color: theme.iconColor }]}>
                                    {uploadingImage ? "Uploading..." : "Tap to change"}
                                </Text>
                            ) : null}
                        </Pressable>

                        <View style={styles.modalButtons}>
                            <Pressable
                                style={[styles.modalBtn, { borderColor: theme.iconColor, borderWidth: 1 }]}
                                onPress={() => setShowEditModal(false)}
                            >
                                <Text style={{ color: theme.text }}>Cancel</Text>
                            </Pressable>
                            <Pressable
                                style={[styles.modalBtn, { backgroundColor: "#007AFF" }]}
                                onPress={handleSaveClubInfo}
                                disabled={savingInfo}
                            >
                                <Text style={{ color: "#fff", fontWeight: "600" }}>
                                    {savingInfo ? "Saving..." : "Save"}
                                </Text>
                            </Pressable>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* ── CREATE POST MODAL ── */}
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
    avatarWrapper: { position: "absolute", bottom: -(AVATAR_SIZE / 2), left: 16 },
    avatar: { width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE / 2, borderWidth: 4 },
    infoSection: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16, marginBottom: 8 },
    nameRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 },
    clubName: { fontSize: 22, fontWeight: "700" },
    meta: { fontSize: 13, marginTop: 2 },
    editButton: { borderWidth: 1, borderRadius: 20, paddingVertical: 6, paddingHorizontal: 14 },
    description: { fontSize: 14, lineHeight: 20, marginTop: 8 },
    actionsRow: { flexDirection: "row", gap: 10, paddingHorizontal: 16, marginBottom: 16 },
    actionBtn: { flex: 1, borderRadius: 12, paddingVertical: 14, alignItems: "center" },
    actionBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
    postsSection: { paddingHorizontal: 16 },
    sectionTitle: { fontSize: 17, fontWeight: "700", marginBottom: 10 },
    emptyText: { fontSize: 14, fontStyle: "italic" },
    modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.4)" },
    modalBox: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, gap: 10 },
    modalTitle: { fontSize: 20, fontWeight: "700", marginBottom: 4 },
    fieldLabel: { fontSize: 12, fontWeight: "600", marginBottom: -4 },
    input: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 15 },
    textArea: { height: 90, textAlignVertical: "top" },
    modalButtons: { flexDirection: "row", justifyContent: "flex-end", gap: 10, marginTop: 8 },
    modalBtn: { borderRadius: 10, paddingVertical: 10, paddingHorizontal: 20 },
    imagePickerBtn: { alignItems: "center", marginBottom: 4 },
    imagePickerPreview: { width: 100, height: 100, borderRadius: 50 },
    imagePickerPlaceholder: { width: 100, height: 100, borderRadius: 50, borderWidth: 1, borderStyle: "dashed", justifyContent: "center", alignItems: "center" },
    changePhotoLabel: { fontSize: 12, marginTop: 6 },
});