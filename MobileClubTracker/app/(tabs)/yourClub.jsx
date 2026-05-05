// Manager dashboard. Edit club info, create events/announcements, manage co-managers.
//
// Now supports MULTIPLE managed orgs:
//   • Reads `?orgId=<id>` from the route. If absent, falls back to the first
//     org in the user's managedOrgs list (back-compat with old deeplinks).
//   • Renders an org switcher when the user manages 2+ clubs.
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
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import DateTimePicker from "@react-native-community/datetimepicker";
import {
    apiFetch,
    getManagedOrgs,
    getOrgManagers,
    addManagerByEmail,
} from "../../utils/auth";
import ThemedView from "../../components/ThemedView";
import ThemedCard from "../../components/ThemedCard";
import { useTheme } from "../../context/ThemeContext";
import { pickAndUploadImage } from "../../utils/uploadImage";

const SCREEN_WIDTH = Dimensions.get("window").width;
const BANNER_HEIGHT = 160;
const AVATAR_SIZE = 90;

export default function YourClub() {
    const router = useRouter();
    const { theme } = useTheme();

    const params = useLocalSearchParams();
    const requestedOrgId = parseInt(String(params.orgId ?? ""), 10);

    // Photon API debounce timer for the location autocomplete.
    const searchTimeout = useRef(null);

    const [managedList, setManagedList] = useState([]); // [{ id, name, ... }]
    const [activeOrgId, setActiveOrgId] = useState(null);
    const [org, setOrg] = useState(null);
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);

    // ── Edit club info ──
    const [editName, setEditName] = useState("");
    const [editDescription, setEditDescription] = useState("");
    const [editImageUrl, setEditImageUrl] = useState("");
    const [uploadingImage, setUploadingImage] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [savingInfo, setSavingInfo] = useState(false);

    // ── Create post ──
    const [modalType, setModalType] = useState(null); // null | "event" | "announcement"
    const [postTitle, setPostTitle] = useState("");
    const [postBody, setPostBody] = useState("");
    const [postLocation, setPostLocation] = useState("");
    const [locationSuggestions, setLocationSuggestions] = useState([]);
    const [locationSearching, setLocationSearching] = useState(false);
    const [postDate, setPostDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // ── Managers ──
    const [managers, setManagers] = useState([]);
    const [showManagersModal, setShowManagersModal] = useState(false);
    const [newManagerEmail, setNewManagerEmail] = useState("");
    const [addingManager, setAddingManager] = useState(false);

    // Org switcher modal — only relevant when the user manages 2+ orgs.
    const [showOrgPicker, setShowOrgPicker] = useState(false);

    useFocusEffect(
        useCallback(() => {
            const loadClub = async () => {
                setLoading(true);
                try {
                    const managed = await getManagedOrgs();
                    setManagedList(managed);
                    if (managed.length === 0) {
                        setOrg(null);
                        setActiveOrgId(null);
                        setLoading(false);
                        return;
                    }

                    // Prefer the orgId from the route param if it's actually
                    // one of the user's managed orgs. Otherwise fall back to
                    // the first one (back-compat with the single-org UI).
                    const valid = Number.isFinite(requestedOrgId) && managed.some((m) => m.id === requestedOrgId);
                    const targetId = valid ? requestedOrgId : managed[0].id;
                    setActiveOrgId(targetId);

                    const [orgRes, postsRes, managersList] = await Promise.all([
                        apiFetch(`/orgs/${targetId}`),
                        apiFetch(`/orgs/${targetId}/posts`),
                        getOrgManagers(targetId).catch(() => []),
                    ]);
                    const orgData = await orgRes.json();
                    const postsData = await postsRes.json();

                    setOrg(orgData);
                    setEditName(orgData.name ?? "");
                    setEditDescription(orgData.description ?? "");
                    setEditImageUrl(orgData.imageUrl ?? "");
                    setPosts(Array.isArray(postsData) ? postsData : []);
                    setManagers(Array.isArray(managersList) ? managersList : []);
                } catch (err) {
                    console.error("Failed to load managed club:", err);
                } finally {
                    setLoading(false);
                }
            };
            loadClub();
        }, [requestedOrgId])
    );

    const switchOrg = (newOrgId) => {
        setShowOrgPicker(false);
        if (newOrgId === activeOrgId) return;
        // Use router.setParams so the focus effect re-runs with the new orgId.
        router.setParams({ orgId: String(newOrgId) });
    };

    const handlePickClubImage = async () => {
        if (!org) return;
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

    const handleSaveClubInfo = async () => {
        if (!editName.trim()) return Alert.alert("Error", "Club name cannot be empty");
        setSavingInfo(true);
        try {
            await apiFetch(`/orgs/${org.id}`, {
                method: "PATCH",
                body: JSON.stringify({
                    name: editName.trim(),
                    description: editDescription.trim(),
                    imageUrl: editImageUrl.trim() || null,
                }),
            });
            const res = await apiFetch(`/orgs/${org.id}`);
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

    const handleAddManager = async () => {
        const email = newManagerEmail.trim().toLowerCase();
        if (!email) return Alert.alert("Error", "Email is required");
        setAddingManager(true);
        try {
            const result = await addManagerByEmail(org.id, null, email);
            const fresh = await getOrgManagers(org.id);
            setManagers(fresh);
            setNewManagerEmail("");
            Alert.alert("Added", `${result.manager.name ?? result.manager.email} is now a manager.`);
        } catch (err) {
            Alert.alert("Error", err.message ?? "Could not add manager.");
        } finally {
            setAddingManager(false);
        }
    };

    // Photon location autocomplete. Debounced 500ms.
    const searchLocation = (text) => {
        setPostLocation(text);
        setLocationSuggestions([]);

        if (text.length < 3) return;
        if (searchTimeout.current) clearTimeout(searchTimeout.current);

        searchTimeout.current = setTimeout(async () => {
            setLocationSearching(true);
            try {
                const res = await fetch(
                    `https://photon.komoot.io/api/?q=${encodeURIComponent(text)}&limit=5`
                );
                const data = await res.json();
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

    const handleSubmitPost = async () => {
        // Validate BEFORE flipping the submitting flag, so a validation
        // failure can't leave the button stuck in "Posting..." state.
        if (!postTitle.trim()) return Alert.alert("Error", "Title is required");
        if (modalType === "event") {
            if (!postLocation.trim()) return Alert.alert("Error", "Location is required");
            // postDate is a Date object — never call .trim() on it. We assert
            // it's a valid Date instead. (The previous code crashed here.)
            if (!(postDate instanceof Date) || isNaN(postDate.getTime())) {
                return Alert.alert("Error", "Date is required");
            }
        } else {
            if (!postBody.trim()) return Alert.alert("Error", "Body is required");
        }

        setSubmitting(true);
        try {
            if (modalType === "event") {
                const res = await apiFetch(`/orgs/${org.id}/events`, {
                    method: "POST",
                    body: JSON.stringify({
                        title: postTitle,
                        location: postLocation,
                        startDateTime: postDate.toISOString(),
                    }),
                });
                if (!res.ok) {
                    const data = await res.json().catch(() => ({}));
                    throw new Error(data.error ?? "Could not create event");
                }
            } else {
                const res = await apiFetch(`/orgs/${org.id}/announcements`, {
                    method: "POST",
                    body: JSON.stringify({ title: postTitle, body: postBody }),
                });
                if (!res.ok) {
                    const data = await res.json().catch(() => ({}));
                    throw new Error(data.error ?? "Could not create announcement");
                }
            }

            const res = await apiFetch(`/orgs/${org.id}/posts`);
            const data = await res.json();
            setPosts(Array.isArray(data) ? data : []);

            setPostTitle("");
            setPostBody("");
            setPostLocation("");
            setPostDate(new Date());
            setModalType(null);
        } catch (err) {
            console.error("Failed to create post:", err);
            Alert.alert("Error", err.message ?? "Something went wrong. Try again.");
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
                                    ? `/events/${postId}`
                                    : `/announcements/${postId}`;
                            const res = await apiFetch(endpoint, { method: "DELETE" });
                            if (!res.ok) throw new Error("Delete failed");
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

                <View style={[styles.infoSection, { backgroundColor: theme.background }]}>
                    <View style={styles.nameRow}>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.clubName, { color: theme.text }]}>{org.name}</Text>
                            <Text style={[styles.meta, { color: theme.iconColor }]}>
                                {org._count?.followers ?? 0} followers
                            </Text>
                        </View>
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

                    {/* Org switcher — only when the user manages multiple clubs */}
                    {managedList.length > 1 && (
                        <Pressable
                            style={[styles.orgSwitcher, { borderColor: theme.iconColor }]}
                            onPress={() => setShowOrgPicker(true)}
                        >
                            <Text style={{ color: theme.text, fontSize: 12, fontWeight: "600" }}>
                                🔀 Managing {managedList.length} clubs · Tap to switch
                            </Text>
                        </Pressable>
                    )}

                    <Pressable
                        style={[styles.managersChip, { borderColor: theme.iconColor }]}
                        onPress={() => setShowManagersModal(true)}
                    >
                        <Text style={{ color: theme.text, fontSize: 12, fontWeight: "600" }}>
                            👥 {managers.length} manager{managers.length === 1 ? "" : "s"} · Tap to manage
                        </Text>
                    </Pressable>
                </View>

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
                                bannerColor={post.color ?? undefined}
                                onPress={() => { }}
                                onDelete={() => handleDeletePost(post.type, post.id)}
                            />
                        ))
                    )}
                </View>
            </ScrollView>

            {/* ── ORG SWITCHER MODAL ── */}
            <Modal
                visible={showOrgPicker}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowOrgPicker(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalBox, { backgroundColor: theme.uiBackground }]}>
                        <Text style={[styles.modalTitle, { color: theme.text }]}>Switch Club</Text>
                        {managedList.map((m) => {
                            const isActive = m.id === activeOrgId;
                            return (
                                <Pressable
                                    key={m.id}
                                    style={[
                                        styles.orgPickerRow,
                                        { borderColor: theme.iconColor },
                                        isActive && { backgroundColor: theme.background },
                                    ]}
                                    onPress={() => switchOrg(m.id)}
                                >
                                    <Text style={{ color: theme.text, fontSize: 15, fontWeight: isActive ? "700" : "500" }}>
                                        {isActive ? "✓ " : ""}{m.name}
                                    </Text>
                                </Pressable>
                            );
                        })}
                        <View style={styles.modalButtons}>
                            <Pressable
                                style={[styles.modalBtn, { borderColor: theme.iconColor, borderWidth: 1 }]}
                                onPress={() => setShowOrgPicker(false)}
                            >
                                <Text style={{ color: theme.text }}>Close</Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>

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
                                <Text style={[styles.fieldLabel, { color: theme.iconColor }]}>Location</Text>
                                <TextInput
                                    placeholder="Search for a location..."
                                    placeholderTextColor={theme.iconColor}
                                    value={postLocation}
                                    onChangeText={searchLocation}
                                    style={[styles.input, { borderColor: theme.iconColor, color: theme.text }]}
                                />

                                {locationSuggestions.length > 0 && (
                                    <View style={[styles.suggestionsBox, { backgroundColor: theme.uiBackground, borderColor: theme.iconColor }]}>
                                        {locationSearching && (
                                            <ActivityIndicator size="small" style={{ padding: 8 }} />
                                        )}
                                        {locationSuggestions.map((place, index) => (
                                            <Pressable
                                                key={`${place.display_name}-${index}`}
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

            {/* ── MANAGERS MODAL ── */}
            <Modal
                visible={showManagersModal}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowManagersModal(false)}
            >
                <KeyboardAvoidingView
                    style={styles.modalOverlay}
                    behavior={Platform.OS === "ios" ? "padding" : undefined}
                >
                    <View style={[styles.modalBox, { backgroundColor: theme.uiBackground }]}>
                        <Text style={[styles.modalTitle, { color: theme.text }]}>Managers</Text>

                        <Text style={[styles.fieldLabel, { color: theme.iconColor }]}>
                            Current managers ({managers.length})
                        </Text>
                        <View style={[styles.managersList, { borderColor: theme.iconColor }]}>
                            {managers.length === 0 ? (
                                <Text style={{ color: theme.iconColor, fontStyle: "italic", padding: 12 }}>
                                    No managers yet.
                                </Text>
                            ) : (
                                managers.map((m, i) => (
                                    <View
                                        key={m.id}
                                        style={[
                                            styles.managerRow,
                                            { borderBottomColor: theme.iconColor },
                                            i === managers.length - 1 && { borderBottomWidth: 0 },
                                        ]}
                                    >
                                        <Image
                                            source={
                                                m.imageUrl
                                                    ? { uri: m.imageUrl }
                                                    : require("../../assets/adaptive-icon.png")
                                            }
                                            style={styles.managerAvatar}
                                        />
                                        <View style={{ flex: 1 }}>
                                            <Text style={{ color: theme.text, fontSize: 14, fontWeight: "600" }}>
                                                {m.name ?? m.email}
                                            </Text>
                                            <Text style={{ color: theme.iconColor, fontSize: 12 }}>
                                                {m.email}
                                            </Text>
                                        </View>
                                    </View>
                                ))
                            )}
                        </View>

                        <Text style={[styles.fieldLabel, { color: theme.iconColor }]}>Add a manager by email</Text>
                        <TextInput
                            value={newManagerEmail}
                            onChangeText={setNewManagerEmail}
                            placeholder="user@example.com"
                            placeholderTextColor={theme.iconColor}
                            autoCapitalize="none"
                            keyboardType="email-address"
                            style={[styles.input, { borderColor: theme.iconColor, color: theme.text }]}
                        />

                        <View style={styles.modalButtons}>
                            <Pressable
                                style={[styles.modalBtn, { borderColor: theme.iconColor, borderWidth: 1 }]}
                                onPress={() => {
                                    setShowManagersModal(false);
                                    setNewManagerEmail("");
                                }}
                            >
                                <Text style={{ color: theme.text }}>Close</Text>
                            </Pressable>
                            <Pressable
                                style={[styles.modalBtn, { backgroundColor: "#007AFF" }]}
                                onPress={handleAddManager}
                                disabled={addingManager}
                            >
                                <Text style={{ color: "#fff", fontWeight: "600" }}>
                                    {addingManager ? "Adding..." : "Add"}
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
    suggestionsBox: { borderWidth: 1, borderRadius: 10, marginTop: -8, overflow: "hidden", maxHeight: 200 },
    suggestionRow: { padding: 12, borderBottomWidth: 1 },
    imagePickerBtn: { alignItems: "center", marginBottom: 4 },
    imagePickerPreview: { width: 100, height: 100, borderRadius: 50 },
    imagePickerPlaceholder: { width: 100, height: 100, borderRadius: 50, borderWidth: 1, borderStyle: "dashed", justifyContent: "center", alignItems: "center" },
    changePhotoLabel: { fontSize: 12, marginTop: 6 },
    managersChip: { alignSelf: "flex-start", borderWidth: 1, borderRadius: 14, paddingVertical: 6, paddingHorizontal: 12, marginTop: 12 },
    managersList: { borderWidth: 1, borderRadius: 10, overflow: "hidden", maxHeight: 220 },
    managerRow: { flexDirection: "row", alignItems: "center", padding: 10, borderBottomWidth: 1, gap: 10 },
    managerAvatar: { width: 36, height: 36, borderRadius: 18 },
    orgSwitcher: { alignSelf: "flex-start", borderWidth: 1, borderRadius: 14, paddingVertical: 6, paddingHorizontal: 12, marginTop: 12 },
    orgPickerRow: { padding: 14, borderRadius: 10, borderWidth: 1, marginBottom: 8 },
});
