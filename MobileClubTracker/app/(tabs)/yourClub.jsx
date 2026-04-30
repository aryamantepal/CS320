// CHANGED: yourClub.jsx is now the full manager dashboard —
// edit club name, description, image URL, and create events/announcements
import React, { useState, useCallback, useRef } from "react";
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
import DateTimePicker from "@react-native-community/datetimepicker";
import { Colors } from "../../constants/Colors";
import { getManagedOrg, API_URL } from "../../utils/auth";
import ThemedView from "../../components/ThemedView";
import ThemedCard from "../../components/ThemedCard";
import { useTheme } from '../../context/ThemeContext';
const SCREEN_WIDTH = Dimensions.get("window").width;
const BANNER_HEIGHT = 160;
const AVATAR_SIZE = 90;

export default function YourClub() {
    const { isDarkMode } = useTheme();
    const theme = Colors[isDarkMode ? "dark" : "light"] ?? Colors.light;

    //Check location when user stops typing
    const searchTimeout = useRef(null);

    const [org, setOrg] = useState(null);
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);

    // ── Edit club info state ──
    const [editName, setEditName] = useState("");
    const [editDescription, setEditDescription] = useState("");
    const [editImageUrl, setEditImageUrl] = useState("");
    const [showEditModal, setShowEditModal] = useState(false);
    const [savingInfo, setSavingInfo] = useState(false);

    // ── Create post state ──
    const [modalType, setModalType] = useState(null); // null | "event" | "announcement"
    const [postTitle, setPostTitle] = useState("");
    const [postBody, setPostBody] = useState("");
    const [postLocation, setPostLocation] = useState("");
    const [locationSuggestions, setLocationSuggestions] = useState([]);
    const [locationSearching, setLocationSearching] = useState(false);
    const [postDate, setPostDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
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

    // Search for location suggestions using Photon API as user types in event location field
    const searchLocation = (text) => {
        setPostLocation(text);
        setLocationSuggestions([]);

        if (text.length < 3) return;

        // Cancel previous pending search
        if (searchTimeout.current) clearTimeout(searchTimeout.current);

        // Wait 500ms after user stops typing before searching
        searchTimeout.current = setTimeout(async () => {
            setLocationSearching(true);
            try {
                const res = await fetch(
                    `https://photon.komoot.io/api/?q=${encodeURIComponent(text)}&limit=5`
                );
                const data = await res.json();
                // Photon returns { features: [...] } instead of an array
                const suggestions = (data.features ?? []).map((f) => ({
                    display_name: [
                        f.properties.name,
                        f.properties.street,
                        f.properties.city,
                        f.properties.country,
                    ].filter(Boolean).join(", "),
                }));
                setLocationSuggestions(suggestions);
            } catch (err) {
                console.error("Location search failed:", err);
            } finally {
                setLocationSearching(false);
            }
        }, 500);
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
                        startDateTime: postDate.toISOString(),
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
            setPostDate(new Date());
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
                                clubName={org.name}
                                title={post.title}
                                subtitle={
                                    post.type === "event"
                                        ? `📍 ${post.location} · ${new Date(post.startDateTime).toLocaleDateString()}`
                                        : post.body
                                }
                                bannerColor={post.color ?? undefined}
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

                        <Text style={[styles.fieldLabel, { color: theme.iconColor }]}>Profile Image URL</Text>
                        <TextInput
                            value={editImageUrl}
                            onChangeText={setEditImageUrl}
                            placeholder="https://example.com/image.png"
                            placeholderTextColor={theme.iconColor}
                            autoCapitalize="none"
                            style={[styles.input, { borderColor: theme.iconColor, color: theme.text }]}
                        />

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
                onRequestClose={() => {
                    setModalType(null);
                    setLocationSuggestions([]);
                    if (searchTimeout.current) clearTimeout(searchTimeout.current);
                }}
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
                                {/* REMOVE the old location TextInput and replace with: */}
                                <Text style={[styles.fieldLabel, { color: theme.iconColor }]}>Location</Text>
                                <TextInput
                                    placeholder="Search for a location..."
                                    placeholderTextColor={theme.iconColor}
                                    value={postLocation}
                                    onChangeText={searchLocation}
                                    style={[styles.input, { borderColor: theme.iconColor, color: theme.text }]}
                                />

                                {/* Suggestions dropdown */}
                                {locationSuggestions.length > 0 && (
                                    <View style={[styles.suggestionsBox, { backgroundColor: theme.uiBackground, borderColor: theme.iconColor }]}>
                                        {locationSearching && (
                                            <ActivityIndicator size="small" style={{ padding: 8 }} />
                                        )}
                                        {locationSuggestions.map((place, index) => (
                                            <Pressable
                                                key={index}
                                                style={[
                                                    styles.suggestionRow,
                                                    { borderBottomColor: theme.iconColor },
                                                    index === locationSuggestions.length - 1 && { borderBottomWidth: 0 },
                                                ]}
                                                onPress={() => {
                                                    setPostLocation(place.display_name);
                                                    setLocationSuggestions([]);
                                                }}
                                            >
                                                <Text style={{ color: theme.text, fontSize: 13 }} numberOfLines={2}>
                                                    📍 {place.display_name}
                                                </Text>
                                            </Pressable>
                                        ))}
                                    </View>
                                )}

                                <Text style={[styles.fieldLabel, { color: theme.iconColor }]}>Date & Time</Text>

                                <Pressable
                                    onPress={() => setShowDatePicker(true)}
                                    style={[styles.input, {
                                        borderColor: theme.iconColor,
                                        justifyContent: "center",
                                    }]}
                                >
                                    <Text style={{ color: theme.text }}>
                                        📅 {postDate.toLocaleString("en-US", {
                                            weekday: "short",
                                            month: "short",
                                            day: "numeric",
                                            year: "numeric",
                                            hour: "2-digit",
                                            minute: "2-digit",
                                        })}
                                    </Text>
                                </Pressable>

                                {showDatePicker && (
                                    <DateTimePicker
                                        value={postDate}
                                        mode="datetime"
                                        display="default"
                                        minimumDate={new Date()}
                                        onChange={(event, selected) => {
                                            setShowDatePicker(false);
                                            if (selected) setPostDate(selected);
                                        }}
                                    />
                                )}
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
    suggestionsBox: { borderWidth: 1, borderRadius: 10, marginTop: -8, overflow: "hidden", maxHeight: 200,},
    suggestionRow: { padding: 12, borderBottomWidth: 1 },
});