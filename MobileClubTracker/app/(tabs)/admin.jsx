import React, { useState, useCallback } from "react";
import {
    View,
    Text,
    ScrollView,
    Pressable,
    StyleSheet,
    useColorScheme,
    ActivityIndicator,
    TextInput,
    Modal,
    KeyboardAvoidingView,
    Platform,
    Alert,
    RefreshControl,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { Colors } from "../../constants/Colors";
import ThemedView from "../../components/ThemedView";
import {
    getUser,
    listClubRequests,
    approveClubRequest,
    rejectClubRequest,
} from "../../utils/auth";

const STATUS_FILTERS = [
    { id: "pending", label: "Pending" },
    { id: "approved", label: "Approved" },
    { id: "rejected", label: "Rejected" },
    { id: "all", label: "All" },
];

export default function Admin() {
    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme] ?? Colors.light;

    const [adminUserId, setAdminUserId] = useState(null);
    const [statusFilter, setStatusFilter] = useState("pending");
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [busyId, setBusyId] = useState(null);

    // Reject modal state
    const [rejectTarget, setRejectTarget] = useState(null); // request object or null
    const [rejectReason, setRejectReason] = useState("");
    const [rejectSubmitting, setRejectSubmitting] = useState(false);

    const loadRequests = useCallback(
        async (uid, status) => {
            if (!uid) return;
            try {
                const data = await listClubRequests(uid, status);
                setRequests(Array.isArray(data) ? data : []);
            } catch (err) {
                console.error("Failed to load club requests:", err);
                Alert.alert("Error", err.message || "Could not load requests.");
            }
        },
        []
    );

    useFocusEffect(
        useCallback(() => {
            let cancelled = false;
            (async () => {
                setLoading(true);
                const user = await getUser();
                if (cancelled) return;
                const uid = user?.id ?? null;
                setAdminUserId(uid);
                await loadRequests(uid, statusFilter);
                if (!cancelled) setLoading(false);
            })();
            return () => {
                cancelled = true;
            };
        }, [statusFilter, loadRequests])
    );

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadRequests(adminUserId, statusFilter);
        setRefreshing(false);
    }, [adminUserId, statusFilter, loadRequests]);

    const handleApprove = (request) => {
        Alert.alert(
            "Approve request?",
            `This will create a new club "${request.clubName}" and make ${request.user?.email ?? "this user"} its manager.`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Approve",
                    onPress: async () => {
                        setBusyId(request.id);
                        try {
                            await approveClubRequest(adminUserId, request.id);
                            await loadRequests(adminUserId, statusFilter);
                        } catch (err) {
                            Alert.alert("Error", err.message || "Approval failed.");
                        } finally {
                            setBusyId(null);
                        }
                    },
                },
            ]
        );
    };

    const openReject = (request) => {
        setRejectTarget(request);
        setRejectReason("");
    };

    const submitReject = async () => {
        if (!rejectTarget) return;
        setRejectSubmitting(true);
        try {
            await rejectClubRequest(adminUserId, rejectTarget.id, rejectReason.trim() || null);
            setRejectTarget(null);
            setRejectReason("");
            await loadRequests(adminUserId, statusFilter);
        } catch (err) {
            Alert.alert("Error", err.message || "Rejection failed.");
        } finally {
            setRejectSubmitting(false);
        }
    };

    if (loading) {
        return (
            <ThemedView safe={true} style={styles.center}>
                <ActivityIndicator size="large" />
            </ThemedView>
        );
    }

    return (
        <ThemedView safe={true} style={{ flex: 1 }}>
            <View style={styles.header}>
                <Text style={[styles.headerTitle, { color: theme.title }]}>Manager Applications</Text>
                <Text style={[styles.headerSub, { color: theme.iconColor }]}>
                    Review requests from users who want to run a club.
                </Text>
            </View>

            <View style={styles.filterRow}>
                {STATUS_FILTERS.map((f) => {
                    const active = f.id === statusFilter;
                    return (
                        <Pressable
                            key={f.id}
                            onPress={() => setStatusFilter(f.id)}
                            style={[
                                styles.filterChip,
                                {
                                    backgroundColor: active ? Colors.primary : theme.uiBackground,
                                    borderColor: active ? Colors.primary : theme.iconColor,
                                },
                            ]}
                        >
                            <Text
                                style={{
                                    color: active ? "#fff" : theme.text,
                                    fontWeight: "600",
                                    fontSize: 13,
                                }}
                            >
                                {f.label}
                            </Text>
                        </Pressable>
                    );
                })}
            </View>

            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                {requests.length === 0 ? (
                    <Text style={[styles.emptyText, { color: theme.iconColor }]}>
                        No {statusFilter === "all" ? "" : statusFilter} requests.
                    </Text>
                ) : (
                    requests.map((r) => (
                        <RequestCard
                            key={r.id}
                            request={r}
                            theme={theme}
                            busy={busyId === r.id}
                            onApprove={() => handleApprove(r)}
                            onReject={() => openReject(r)}
                        />
                    ))
                )}
            </ScrollView>

            {/* ── REJECT MODAL ── */}
            <Modal
                visible={rejectTarget !== null}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setRejectTarget(null)}
            >
                <KeyboardAvoidingView
                    style={styles.modalOverlay}
                    behavior={Platform.OS === "ios" ? "padding" : undefined}
                >
                    <View style={[styles.modalBox, { backgroundColor: theme.uiBackground }]}>
                        <Text style={[styles.modalTitle, { color: theme.text }]}>
                            Reject "{rejectTarget?.clubName}"?
                        </Text>
                        <Text style={[styles.fieldLabel, { color: theme.iconColor }]}>
                            Reason (optional)
                        </Text>
                        <TextInput
                            value={rejectReason}
                            onChangeText={setRejectReason}
                            placeholder="Let the applicant know why..."
                            placeholderTextColor={theme.iconColor}
                            multiline
                            numberOfLines={3}
                            style={[
                                styles.input,
                                styles.textArea,
                                { borderColor: theme.iconColor, color: theme.text },
                            ]}
                        />
                        <View style={styles.modalButtons}>
                            <Pressable
                                style={[styles.modalBtn, { borderColor: theme.iconColor, borderWidth: 1 }]}
                                onPress={() => setRejectTarget(null)}
                                disabled={rejectSubmitting}
                            >
                                <Text style={{ color: theme.text }}>Cancel</Text>
                            </Pressable>
                            <Pressable
                                style={[styles.modalBtn, { backgroundColor: Colors.warning }]}
                                onPress={submitReject}
                                disabled={rejectSubmitting}
                            >
                                <Text style={{ color: "#fff", fontWeight: "600" }}>
                                    {rejectSubmitting ? "Rejecting..." : "Reject"}
                                </Text>
                            </Pressable>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </ThemedView>
    );
}

function RequestCard({ request, theme, busy, onApprove, onReject }) {
    const isPending = request.status === "pending";
    const statusColor =
        request.status === "approved"
            ? "#34C759"
            : request.status === "rejected"
              ? Colors.warning
              : Colors.primary;

    return (
        <View style={[styles.card, { backgroundColor: theme.uiBackground }]}>
            <View style={styles.cardHeader}>
                <Text style={[styles.clubName, { color: theme.title }]} numberOfLines={1}>
                    {request.clubName}
                </Text>
                <View style={[styles.statusPill, { backgroundColor: statusColor }]}>
                    <Text style={styles.statusText}>{request.status.toUpperCase()}</Text>
                </View>
            </View>

            <Text style={[styles.applicant, { color: theme.text }]} numberOfLines={1}>
                {request.user?.name ? `${request.user.name} · ` : ""}
                {request.user?.email}
            </Text>

            <Text style={[styles.meta, { color: theme.iconColor }]}>
                📍 {request.location} · submitted{" "}
                {new Date(request.createdAt).toLocaleDateString()}
            </Text>

            {request.description ? (
                <Text style={[styles.description, { color: theme.text }]}>
                    {request.description}
                </Text>
            ) : null}

            {request.status === "rejected" && request.rejectionReason ? (
                <Text style={[styles.reason, { color: Colors.warning }]}>
                    Reason: {request.rejectionReason}
                </Text>
            ) : null}

            {request.reviewedBy ? (
                <Text style={[styles.reviewer, { color: theme.iconColor }]}>
                    Reviewed by {request.reviewedBy.email}
                    {request.reviewedAt
                        ? ` · ${new Date(request.reviewedAt).toLocaleDateString()}`
                        : ""}
                </Text>
            ) : null}

            {isPending ? (
                <View style={styles.actionsRow}>
                    <Pressable
                        style={[styles.actionBtn, { backgroundColor: Colors.warning }]}
                        onPress={onReject}
                        disabled={busy}
                    >
                        <Text style={styles.actionText}>Reject</Text>
                    </Pressable>
                    <Pressable
                        style={[styles.actionBtn, { backgroundColor: "#34C759" }]}
                        onPress={onApprove}
                        disabled={busy}
                    >
                        <Text style={styles.actionText}>
                            {busy ? "Working..." : "Approve"}
                        </Text>
                    </Pressable>
                </View>
            ) : null}
        </View>
    );
}

const styles = StyleSheet.create({
    center: { flex: 1, justifyContent: "center", alignItems: "center" },
    header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
    headerTitle: { fontSize: 24, fontWeight: "800" },
    headerSub: { fontSize: 13, marginTop: 4 },
    filterRow: {
        flexDirection: "row",
        gap: 8,
        paddingHorizontal: 20,
        paddingBottom: 12,
        flexWrap: "wrap",
    },
    filterChip: {
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: 20,
        borderWidth: 1,
    },
    scrollContent: { paddingHorizontal: 20, paddingBottom: 120, gap: 12 },
    emptyText: { fontSize: 14, fontStyle: "italic", textAlign: "center", marginTop: 40 },
    card: {
        borderRadius: 14,
        padding: 16,
        gap: 6,
    },
    cardHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
    },
    clubName: { fontSize: 17, fontWeight: "700", flex: 1 },
    statusPill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
    statusText: { color: "#fff", fontSize: 10, fontWeight: "700", letterSpacing: 0.5 },
    applicant: { fontSize: 14, fontWeight: "600" },
    meta: { fontSize: 12 },
    description: { fontSize: 14, lineHeight: 20, marginTop: 4 },
    reason: { fontSize: 13, marginTop: 4, fontStyle: "italic" },
    reviewer: { fontSize: 11, marginTop: 2 },
    actionsRow: { flexDirection: "row", gap: 10, marginTop: 10 },
    actionBtn: {
        flex: 1,
        borderRadius: 10,
        paddingVertical: 11,
        alignItems: "center",
    },
    actionText: { color: "#fff", fontWeight: "700", fontSize: 14 },
    modalOverlay: {
        flex: 1,
        justifyContent: "flex-end",
        backgroundColor: "rgba(0,0,0,0.4)",
    },
    modalBox: {
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 24,
        gap: 10,
    },
    modalTitle: { fontSize: 18, fontWeight: "700" },
    fieldLabel: { fontSize: 12, fontWeight: "600" },
    input: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 15 },
    textArea: { height: 90, textAlignVertical: "top" },
    modalButtons: {
        flexDirection: "row",
        justifyContent: "flex-end",
        gap: 10,
        marginTop: 8,
    },
    modalBtn: { borderRadius: 10, paddingVertical: 10, paddingHorizontal: 20 },
});
