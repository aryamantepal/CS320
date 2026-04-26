import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";

// Use your computer's local IP (not localhost!) so your phone can reach it
// Run `ipconfig` (Windows) or `ifconfig` (Mac) to find it
export const API_URL = Constants.expoConfig.extra.apiUrl;

const USER_KEY = "loggedInUser";

export const registerUser = async (email, password, name = null) => {
    const response = await fetch(`${API_URL}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, ...(name && { name }) }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    return data;
};

export const loginUser = async (email, password) => {
    const response = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);

    // Store the full user object so screens can access id, email, etc.
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(data.user));
    return data;
};

export const logoutUser = async () => {
    await AsyncStorage.removeItem(USER_KEY);
};

export const getUser = async () => {
    const raw = await AsyncStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
};

export const getUserId = async () => {
    const user = await getUser();
    return user ? user.id : null;
};


export const isManager = async () => {
    const user = await getUser();
    return user?.role === "manager";
};

export const isAdmin = async () => {
    const user = await getUser();
    return user?.role === "admin";
};

// Returns the full list of orgs this user manages (empty array if none).
export const getManagedOrgs = async () => {
    const user = await getUser();
    return user?.managedOrgs ?? [];
};

// Back-compat for screens that still assume a single managed org —
// returns the first managed org, or null.
export const getManagedOrg = async () => {
    const orgs = await getManagedOrgs();
    return orgs[0] ?? null;
};

// ── ADMIN: CLUB REQUESTS ─────────────────────────────────────────────────────
// All admin API calls pass the caller's userId as adminUserId; the server
// verifies role === "admin" before acting.

export const listClubRequests = async (adminUserId, status = "pending") => {
    const response = await fetch(
        `${API_URL}/admin/club-requests?status=${encodeURIComponent(status)}&adminUserId=${adminUserId}`
    );
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    return data;
};

export const approveClubRequest = async (adminUserId, requestId) => {
    const response = await fetch(`${API_URL}/admin/club-requests/${requestId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminUserId }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    return data;
};

export const rejectClubRequest = async (adminUserId, requestId, reason = null) => {
    const response = await fetch(`${API_URL}/admin/club-requests/${requestId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminUserId, ...(reason && { reason }) }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    return data;
};

export const updateUser = async (userId, fields) => {
    const response = await fetch(`${API_URL}/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    // Update stored user so getUser() returns fresh data
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(data.user));
    return data.user;
};