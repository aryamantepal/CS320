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
    // CHANGED: added Modal, TextInput, KeyboardAvoidingView, Platform for the club request form
    Modal,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    Alert,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Colors } from "../../constants/Colors";
import { logoutUser, getUser, getUserId, API_URL } from "../../utils/auth";
import ThemedView from "../../components/ThemedView.jsx";

const SCREEN_WIDTH = Dimensions.get("window").width;
const BANNER_HEIGHT = 140;
const AVATAR_SIZE = 90;

export default function Profile() {
    const router = useRouter();
    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme] ?? Colors.light;

    const [user, setUser] = useState(null);
    const [followedOrgs, setFollowedOrgs] = useState([]);
    const [loading, setLoading] = useState(true);

    // CHANGED: controls the "Be a Club Manager" modal visibility
    const [showRequestModal, setShowRequestModal] = useState(false);

    // CHANGED: form fields for the club manager request
    const [clubName, setClubName] = useState("");
    const [clubDescription, setClubDescription] = useState("");
    const [clubLocation, setClubLocation] = useState("");
    const [submitting, setSubmitting] = useState(false);

    useFocusEffect(
        useCallback(() => {
            const loadProfile = async () => {
                setLoading(true);
                const currentUser = await getUser();
                setUser(currentUser);

                if (currentUser) {
                    try {
                        const res = await fetch(`${API_URL}/follows/${currentUser.id}/orgs`);
                        const data = await res.json();
                        setFollowedOrgs(Array.isArray(data) ? data : []);
                    } catch (err) {
                        console.error("Failed to load followed orgs:", err);
                    }
                }
                setLoading(false);
            };
            loadProfile();
        }, [])
    );

    const handleLogout = async () => {
        await logoutUser();
        router.replace("/(auth)/login");
    };

    // CHANGED: submits the club manager request to the backend
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

            // Reset form and close modal
            setClubName("");
            setClubDescription("");
            setClubLocation("");
            setShowRequestModal(false);

            Alert.alert(
                "Request Submitted!",
                "Your request has been sent to the admins. You will be notified once it's approved."
            );
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
        <ThemedView safe={true} style={{ flex: 1 }}>
            <ScrollView
                style={{ backgroundColor: "transparent" }}
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
                        <Image
                            source={require("../../assets/adaptive-icon.png")}
                            style={[styles.avatar, { borderColor: theme.background }]}
                        />
                    </View>
                </View>

                {/* ── USER INFO ── */}
                <View style={[styles.infoSection, { backgroundColor: theme.uiBackground }]}>
                    <Text style={[styles.name, { color: theme.text }]}>
                        {user?.name ?? user?.email ?? ""}
                    </Text>
                    <Pressable
                        style={[styles.editButton, { borderColor: theme.iconColor }]}
                        onPress={() => {}}
                    >
                        <Text style={[styles.editButtonText, { color: theme.text }]}>Edit Profile</Text>
                    </Pressable>
                </View>

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
                                    source={require("../../assets/adaptive-icon.png")}
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
                        { label: "Change Password", onPress: () => {} },
                        { label: "Notifications", onPress: () => {} },
                        { label: "Privacy", onPress: () => {} },
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

                    {/* CHANGED: "Be a Club Manager" button — only shown to base users, not managers */}
                    {user?.role !== "manager" && (
                        <Pressable
                            style={[styles.settingsRow, { backgroundColor: theme.uiBackground }]}
                            onPress={() => setShowRequestModal(true)}
                        >
                            <Text style={[styles.settingsLabel, { color: "#007AFF" }]}>
                                🏛️ Be a Club Manager
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

            {/* CHANGED: Club Manager Request Modal */}
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
                        <Text style={[styles.modalTitle, { color: theme.text }]}>
                            Start Your Club
                        </Text>
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
    name: { fontSize: 22, fontWeight: "700", marginBottom: 12 },
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

    // CHANGED: modal styles
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
    modalTitle: { fontSize: 20, fontWeight: "700" },
    modalSubtitle: { fontSize: 13, marginBottom: 4 },
    input: {
        borderWidth: 1,
        borderRadius: 10,
        padding: 12,
        fontSize: 15,
    },
    textArea: { height: 80, textAlignVertical: "top" },
    modalButtons: { flexDirection: "row", justifyContent: "flex-end", gap: 10, marginTop: 8 },
    modalBtn: { borderRadius: 10, paddingVertical: 10, paddingHorizontal: 20 },
});