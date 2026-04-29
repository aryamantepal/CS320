import React, { useState, useCallback } from "react";
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
    Modal,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    Alert,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Colors } from "../../constants/Colors";
import { logoutUser, getUser, getManagedOrgs, API_URL, updateUser } from "../../utils/auth";
import ThemedView from "../../components/ThemedView.jsx";
import { useTheme } from "../../context/ThemeContext";
import { registerForPushNotifications } from "../../utils/notifications";
import { pickAndUploadImage } from "../../utils/uploadImage";

const SCREEN_WIDTH = Dimensions.get("window").width;
const BANNER_HEIGHT = 140;
const AVATAR_SIZE = 90;

export default function Profile() {
    const router = useRouter();
    const systemScheme = useColorScheme();

    const { theme, isDarkMode, setIsDarkMode } = useTheme();
    const [user, setUser] = useState(null);
    const [followedOrgs, setFollowedOrgs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [managedOrgs, setManagedOrgs] = useState([]);

    // CHANGED: Edit Profile modal state
    const [showEditModal, setShowEditModal] = useState(false);
    const [editName, setEditName] = useState("");
    const [editImageUrl, setEditImageUrl] = useState("");
    const [uploadingImage, setUploadingImage] = useState(false);
    const [savingProfile, setSavingProfile] = useState(false);

    // Club manager request state
    const [showRequestModal, setShowRequestModal] = useState(false);
    const [clubName, setClubName] = useState("");
    const [clubDescription, setClubDescription] = useState("");
    const [clubLocation, setClubLocation] = useState("");
    const [submitting, setSubmitting] = useState(false);

    // ── Add to state declarations at the top of Profile() ──
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [changingPassword, setChangingPassword] = useState(false);

    const [notificationsEnabled, setNotificationsEnabled] = useState(false);
    const [privateProfile, setPrivateProfile] = useState(false);

    useFocusEffect(
        useCallback(() => {
            const loadProfile = async () => {
                setLoading(true);
                const currentUser = await getUser();
                setUser(currentUser);

                if (currentUser) {
                    try {
                        const [followsRes, managed] = await Promise.all([
                            fetch(`${API_URL}/follows/${currentUser.id}/orgs`),
                            getManagedOrgs(),
                        ]);
                        const followsData = await followsRes.json();

                        // Hydrate each managed org with follower counts (the cached user
                        // object from login doesn't include _count).
                        const hydrated = await Promise.all(
                            (managed ?? []).map(async (m) => {
                                try {
                                    const r = await fetch(`${API_URL}/orgs/${m.id}`);
                                    return r.ok ? await r.json() : m;
                                } catch {
                                    return m;
                                }
                            })
                        );
                        setManagedOrgs(hydrated);

                        const managedIds = new Set(hydrated.map((o) => o.id));
                        setFollowedOrgs(
                            Array.isArray(followsData)
                                ? followsData.filter((org) => !managedIds.has(org.id))
                                : []
                        );
                    } catch (err) {
                        console.error("Failed to load profile data:", err);
                    }
                }
                setLoading(false);
            };
            loadProfile();
        }, [])
    );

    const handlePickProfileImage = async () => {
        setUploadingImage(true);
        try {
            const url = await pickAndUploadImage("club-images", `users/${user.id}.jpg`);
            if (url) setEditImageUrl(url);
        } catch (err) {
            Alert.alert("Error", err.message ?? "Could not upload image.");
        } finally {
            setUploadingImage(false);
        }
    };

    // CHANGED: open edit modal pre-filled with current values
    const handleOpenEditModal = () => {
        setEditName(user?.name ?? "");
        setEditImageUrl(user?.imageUrl ?? "");
        setShowEditModal(true);
    };

    // CHANGED: save name and image URL, update local state immediately
    const handleSaveProfile = async () => {
        setSavingProfile(true);
        try {
            const updated = await updateUser(user.id, {
                name: editName.trim() || null,
                imageUrl: editImageUrl.trim() || null,
            });
            setUser(updated);
            setShowEditModal(false);
            Alert.alert("Saved!", "Your profile has been updated.");
        } catch (err) {
            Alert.alert("Error", err.message ?? "Could not save. Try again.");
        } finally {
            setSavingProfile(false);
        }
    };

    const handleLogout = async () => {
        await logoutUser();
        router.replace("/(auth)/login");
    };

    const handleSubmitRequest = async () => {
        if (!clubName.trim()) return Alert.alert("Error", "Club name is required");
        if (!clubDescription.trim()) return Alert.alert("Error", "Description is required");
        if (!clubLocation.trim()) return Alert.alert("Error", "Location is required");

        setSubmitting(true);
        try {
            const res = await fetch(`${API_URL}/club-requests`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userId: user.id,
                    clubName: clubName.trim(),
                    description: clubDescription.trim(),
                    location: clubLocation.trim(),
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            setClubName("");
            setClubDescription("");
            setClubLocation("");
            setShowRequestModal(false);
            Alert.alert("Request Submitted!", "Your request has been sent to the admins. You will be notified once it's approved.");
        } catch (err) {
            Alert.alert("Error", err.message ?? "Something went wrong. Try again.");
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
        <ThemedView safe={true} style={{ flex: 1, backgroundColor: theme.background }}>
            <ScrollView
                style={{ backgroundColor: theme.background }}
                contentContainerStyle={styles.scrollContent}
            >
                {/* ── HEADER: Banner + Avatar ── */}
                <View style={styles.headerContainer}>
                    <Image
                        source={require("../../assets/splash-icon.png")}
                        style={styles.banner}
                        resizeMode="cover"
                    />
                    <View style={styles.avatarWrapper}>
                        {/* CHANGED: show custom profile picture if set */}
                        <Image
                            source={
                                user?.imageUrl
                                    ? { uri: user.imageUrl }
                                    : require("../../assets/adaptive-icon.png")
                            }
                            style={[styles.avatar, { borderColor: theme.background }]}
                        />
                    </View>
                </View>

                {/* ── USER INFO ── */}
                <View style={[styles.infoSection, { backgroundColor: theme.uiBackground }]}>
                    <Text style={[styles.name, { color: theme.text }]}>
                        {user?.name ?? user?.email ?? ""}
                    </Text>
                    {user?.role === "manager" && (
                        <Text style={styles.managerBadge}>🏛️ Club Manager</Text>
                    )}
                    {user?.role === "admin" && (
                        <Text style={styles.adminBadge}>🛡️ Admin</Text>
                    )}
                    {/* CHANGED: Edit Profile now opens the modal */}
                    <Pressable
                        style={[styles.editButton, { borderColor: theme.iconColor, backgroundColor: theme.uiBackground }]}
                        onPress={handleOpenEditModal}
                    >
                        <Text style={[styles.editButtonText, { color: theme.text }]}>Edit Profile</Text>
                    </Pressable>
                </View>

                {/* ── YOUR CLUBS (managers only) ── */}
                {managedOrgs.length > 0 && (
                    <View style={styles.sectionContainer}>
                        <Text style={[styles.sectionTitle, { color: theme.text }]}>
                            {managedOrgs.length === 1 ? "Your Club" : "Your Clubs"}
                        </Text>
                        {managedOrgs.map((org) => (
                            <Pressable
                                key={org.id}
                                style={[styles.clubRow, { backgroundColor: theme.uiBackground }]}
                                onPress={() => router.push("/(tabs)/yourClub")}
                            >
                                <Image
                                    source={
                                        org.imageUrl
                                            ? { uri: org.imageUrl }
                                            : require("../../assets/adaptive-icon.png")
                                    }
                                    style={styles.clubAvatar}
                                />
                                <View style={styles.clubInfo}>
                                    <Text style={[styles.clubName, { color: theme.text }]}>{org.name}</Text>
                                    <Text style={[styles.clubMeta, { color: theme.iconColor }]}>
                                        {org._count?.followers ?? 0} followers · Tap to manage
                                    </Text>
                                </View>
                                <Text style={{ color: theme.iconColor, fontSize: 18 }}>›</Text>
                            </Pressable>
                        ))}
                    </View>
                )}

                {/* ── FOLLOWED CLUBS ── */}
                <View style={styles.sectionContainer}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>Followed Clubs</Text>
                    {followedOrgs.length === 0 ? (
                        <Text style={[styles.emptyText, { color: theme.iconColor }]}>
                            You haven't followed any clubs yet.
                        </Text>
                    ) : (
                        followedOrgs.map((org) => (
                            <Pressable
                                key={org.id}
                                style={[styles.clubRow, { backgroundColor: theme.uiBackground }]}
                                onPress={() =>
                                    router.push({
                                        pathname: "/clubProfile",
                                        params: { id: org.id, name: org.name },
                                    })
                                }
                            >
                                <Image
                                    source={
                                        org.imageUrl
                                            ? { uri: org.imageUrl }
                                            : require("../../assets/adaptive-icon.png")
                                    }
                                    style={styles.clubAvatar}
                                />
                                <View style={styles.clubInfo}>
                                    <Text style={[styles.clubName, { color: theme.text }]}>{org.name}</Text>
                                    <Text style={[styles.clubMeta, { color: theme.iconColor }]}>
                                        {org._count?.followers ?? 0} followers
                                    </Text>
                                </View>
                                <Text style={{ color: theme.iconColor, fontSize: 18 }}>›</Text>
                            </Pressable>
                        ))
                    )}
                </View>

                {/* ── ACCOUNT SETTINGS ── */}
                <View style={styles.sectionContainer}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>Account Settings</Text>
                    {[
                        {
                            label: "Dark Mode",
                            onPress: () => setIsDarkMode((v) => !v),
                        },
                        {
                            label: "Change Password",
                            onPress: () => setShowPasswordModal(true),
                        },

                        {
                            label: `Notifications   ${notificationsEnabled ? "🔔 On" : "🔕 Off"}`,
                            onPress: async () => {
                                if (!notificationsEnabled) {
                                    const token = await registerForPushNotifications(user.id);
                                    if (token) setNotificationsEnabled(true);
                                    // if they denied permission, token is null and toggle stays off
                                } else {
                                    // Optionally: tell server to delete the token
                                    setNotificationsEnabled(false);
                                }
                            },
                        },
                        {
                            label: `Theme   ${isDarkMode ? "🌙 Dark" : "☀️ Light"}`,
                            onPress: () => {
                                setIsDarkMode((v) => {
                                    const newValue = !v;
                                    //console.log("Dark mode:", newValue);
                                    return newValue;
                                });
                            },

                        },               
                        {
                            label: `Privacy   ${privateProfile ? "🔒 Private" : "🌐 Public"}`,
                            onPress: () => setPrivateProfile((v) => !v),
                        },
                    ].map((item, index) => (
                        <Pressable
                            key={index}
                            style={[styles.settingsRow, { backgroundColor: theme.uiBackground }]}
                            onPress={item.onPress}
                        >
                            <Text style={[styles.settingsLabel, { color: theme.text }]}>{item.label}</Text>
                            <Text style={{ color: theme.iconColor, fontSize: 18 }}>›</Text>
                        </Pressable>
                    ))}

                    {user?.role !== "admin" && (
                        <Pressable
                            style={[styles.settingsRow, { backgroundColor: theme.uiBackground }]}
                            onPress={() => setShowRequestModal(true)}
                        >
                            <Text style={[styles.settingsLabel, { color: "#007AFF" }]}>
                                {user?.role === "manager" ? "🏛️ Apply for Another Club" : "🏛️ Be a Club Manager"}
                            </Text>
                            <Text style={{ color: theme.iconColor, fontSize: 18 }}>›</Text>
                        </Pressable>
                    )}

                    <Pressable
                        style={[styles.settingsRow, { backgroundColor: theme.uiBackground }]}
                        onPress={handleLogout}
                    >
                        <Text style={[styles.settingsLabel, { color: "tomato" }]}>Log Out</Text>
                    </Pressable>
                </View>
            </ScrollView>

            {/* CHANGED: Edit Profile Modal with name + image URL + live preview */}
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
                        <Text style={[styles.modalTitle, { color: theme.text }]}>Edit Profile</Text>

                        <Pressable style={styles.avatarPreviewContainer} onPress={handlePickProfileImage} disabled={uploadingImage}>
                            <Image
                                source={
                                    editImageUrl.trim()
                                        ? { uri: editImageUrl.trim() }
                                        : require("../../assets/adaptive-icon.png")
                                }
                                style={styles.avatarPreview}
                            />
                            <Text style={[styles.previewLabel, { color: theme.iconColor }]}>
                                {uploadingImage ? "Uploading..." : "Tap to change photo"}
                            </Text>
                        </Pressable>

                        <Text style={[styles.fieldLabel, { color: theme.iconColor }]}>Display Name</Text>
                        <TextInput
                            placeholder="Your name"
                            placeholderTextColor={theme.iconColor}
                            value={editName}
                            onChangeText={setEditName}
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
                                onPress={handleSaveProfile}
                                disabled={savingProfile}
                            >
                                <Text style={{ color: "#fff", fontWeight: "600" }}>
                                    {savingProfile ? "Saving..." : "Save"}
                                </Text>
                            </Pressable>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            

            {/* ── CLUB MANAGER REQUEST MODAL ── */}
            <Modal
                visible={showRequestModal}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowRequestModal(false)}
            >
                <KeyboardAvoidingView
                    style={styles.modalOverlay}
                    behavior={Platform.OS === "ios" ? "padding" : undefined}
                >
                    <View style={[styles.modalBox, { backgroundColor: theme.uiBackground }]}>
                        <Text style={[styles.modalTitle, { color: theme.text }]}>Start Your Club</Text>
                        <Text style={[styles.modalSubtitle, { color: theme.iconColor }]}>
                            Fill out the form below and our admins will review your request.
                        </Text>

                        <TextInput
                            placeholder="Club Name"
                            placeholderTextColor={theme.iconColor}
                            value={clubName}
                            onChangeText={setClubName}
                            style={[styles.input, { borderColor: theme.iconColor, color: theme.text }]}
                        />
                        <TextInput
                            placeholder="Description"
                            placeholderTextColor={theme.iconColor}
                            value={clubDescription}
                            onChangeText={setClubDescription}
                            multiline
                            numberOfLines={3}
                            style={[styles.input, styles.textArea, { borderColor: theme.iconColor, color: theme.text }]}
                        />
                        <TextInput
                            placeholder="Location (e.g. UMass Amherst)"
                            placeholderTextColor={theme.iconColor}
                            value={clubLocation}
                            onChangeText={setClubLocation}
                            style={[styles.input, { borderColor: theme.iconColor, color: theme.text }]}
                        />

                        <View style={styles.modalButtons}>
                            <Pressable
                                style={[styles.modalBtn, { borderColor: theme.iconColor, borderWidth: 1 }]}
                                onPress={() => setShowRequestModal(false)}
                            >
                                <Text style={{ color: theme.text }}>Cancel</Text>
                            </Pressable>
                            <Pressable
                                style={[styles.modalBtn, { backgroundColor: "#007AFF" }]}
                                onPress={handleSubmitRequest}
                                disabled={submitting}
                            >
                                <Text style={{ color: "#fff", fontWeight: "600" }}>
                                    {submitting ? "Submitting..." : "Submit"}
                                </Text>
                            </Pressable>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* ── CHANGE PASSWORD MODAL ── */}
            <Modal
                visible={showPasswordModal}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowPasswordModal(false)}
            >
                <KeyboardAvoidingView
                    style={styles.modalOverlay}
                    behavior={Platform.OS === "ios" ? "padding" : undefined}
                >
                    <View style={[styles.modalBox, { backgroundColor: theme.uiBackground }]}>
                        <Text style={[styles.modalTitle, { color: theme.text }]}>
                            Change Password
                        </Text>

                        <Text style={[styles.fieldLabel, { color: theme.iconColor }]}>
                            Current Password
                        </Text>
                        <TextInput
                            placeholder="Enter current password"
                            placeholderTextColor={theme.iconColor}
                            value={currentPassword}
                            onChangeText={setCurrentPassword}
                            secureTextEntry
                            style={[styles.input, { borderColor: theme.iconColor, color: theme.text }]}
                        />

                        <Text style={[styles.fieldLabel, { color: theme.iconColor }]}>
                            New Password
                        </Text>
                        <TextInput
                            placeholder="At least 6 characters"
                            placeholderTextColor={theme.iconColor}
                            value={newPassword}
                            onChangeText={setNewPassword}
                            secureTextEntry
                            style={[styles.input, { borderColor: theme.iconColor, color: theme.text }]}
                        />

                        <Text style={[styles.fieldLabel, { color: theme.iconColor }]}>
                            Confirm New Password
                        </Text>
                        <TextInput
                            placeholder="Repeat new password"
                            placeholderTextColor={theme.iconColor}
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                            secureTextEntry
                            style={[styles.input, { borderColor: theme.iconColor, color: theme.text }]}
                        />

                        <View style={styles.modalButtons}>
                            <Pressable
                                style={[styles.modalBtn, { borderColor: theme.iconColor, borderWidth: 1 }]}
                                onPress={() => {
                                    setShowPasswordModal(false);
                                    setCurrentPassword("");
                                    setNewPassword("");
                                    setConfirmPassword("");
                                }}
                            >
                                <Text style={{ color: theme.text }}>Cancel</Text>
                            </Pressable>
                            <Pressable
                                style={[styles.modalBtn, { backgroundColor: "#007AFF" }]}
                                disabled={changingPassword}
                                onPress={async () => {
                                    if (newPassword !== confirmPassword) {
                                        return Alert.alert("Error", "New passwords don't match");
                                    }
                                    if (newPassword.length < 6) {
                                        return Alert.alert("Error", "New password must be at least 6 characters");
                                    }
                                    setChangingPassword(true);
                                    try {
                                        const res = await fetch(`${API_URL}/users/${user.id}/password`, {
                                            method: "PATCH",
                                            headers: { "Content-Type": "application/json" },
                                            body: JSON.stringify({ currentPassword, newPassword }),
                                        });
                                        const data = await res.json();
                                        if (!res.ok) throw new Error(data.error);
                                        setShowPasswordModal(false);
                                        setCurrentPassword("");
                                        setNewPassword("");
                                        setConfirmPassword("");
                                        Alert.alert("Success", "Password updated successfully.");
                                    } catch (err) {
                                        Alert.alert("Error", err.message ?? "Could not update password.");
                                    } finally {
                                        setChangingPassword(false);
                                    }
                                }}
                            >
                                <Text style={{ color: "#fff", fontWeight: "600" }}>
                                    {changingPassword ? "Saving..." : "Save"}
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
    name: { fontSize: 22, fontWeight: "700", marginBottom: 4 },
    managerBadge: { fontSize: 13, color: "#007AFF", fontWeight: "600", marginBottom: 10 },
    adminBadge: { fontSize: 13, color: "#6849a7", fontWeight: "600", marginBottom: 10 },
    editButton: { alignSelf: "flex-start", borderWidth: 1, borderRadius: 20, paddingVertical: 6, paddingHorizontal: 16 },
    editButtonText: { fontSize: 14, fontWeight: "500" },
    sectionContainer: { marginBottom: 8, paddingHorizontal: 16 },
    sectionTitle: { fontSize: 17, fontWeight: "700", marginBottom: 10, marginTop: 8 },
    emptyText: { fontSize: 14, fontStyle: "italic" },
    clubRow: { flexDirection: "row", alignItems: "center", padding: 12, borderRadius: 12, marginBottom: 8 },
    clubAvatar: { width: 44, height: 44, borderRadius: 22, marginRight: 12, backgroundColor: "#ccc" },
    clubInfo: { flex: 1 },
    clubName: { fontSize: 15, fontWeight: "600" },
    clubMeta: { fontSize: 12, marginTop: 2 },
    settingsRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 14, borderRadius: 12, marginBottom: 8 },
    settingsLabel: { fontSize: 15 },
    modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.4)" },
    modalBox: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, gap: 12 },
    modalTitle: { fontSize: 20, fontWeight: "700" },
    modalSubtitle: { fontSize: 13, marginBottom: 4 },
    fieldLabel: { fontSize: 12, fontWeight: "600", marginBottom: -4 },
    // CHANGED: avatar preview in edit modal
    avatarPreviewContainer: { alignItems: "center", marginBottom: 4 },
    avatarPreview: { width: 80, height: 80, borderRadius: 40, backgroundColor: "#ccc", marginBottom: 6 },
    previewLabel: { fontSize: 12 },
    input: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 15 },
    textArea: { height: 80, textAlignVertical: "top" },
    modalButtons: { flexDirection: "row", justifyContent: "flex-end", gap: 10, marginTop: 8 },
    modalBtn: { borderRadius: 10, paddingVertical: 10, paddingHorizontal: 20 },
});