import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";

// Use your computer's local IP (not localhost!) so your phone can reach it.
// Run `ipconfig` (Windows) or `ifconfig` (Mac) to find it.
export const API_URL = Constants.expoConfig?.extra?.apiUrl;

const USER_KEY = "loggedInUser";
const TOKEN_KEY = "loggedInUserToken";

// In-memory cache. Keeps `getAuthToken()` synchronous so we can attach it from
// the global fetch patch in app/_layout.jsx without awaiting AsyncStorage on
// every request. Hydrated by `bootstrapAuth()` at app startup.
let _user = null;
let _token = null;
let _bootstrapped = false;

export async function bootstrapAuth() {
    if (_bootstrapped) return { user: _user, token: _token };
    const [rawUser, rawToken] = await Promise.all([
        AsyncStorage.getItem(USER_KEY),
        AsyncStorage.getItem(TOKEN_KEY),
    ]);
    _user = rawUser ? JSON.parse(rawUser) : null;
    _token = rawToken;
    _bootstrapped = true;
    return { user: _user, token: _token };
}

// Synchronous accessor used by the global fetch patch.
export function getAuthToken() {
    return _token;
}

async function setAuthState(user, token) {
    _user = user ?? null;
    _token = token ?? null;
    if (user) {
        await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
    } else {
        await AsyncStorage.removeItem(USER_KEY);
    }
    if (token) {
        await AsyncStorage.setItem(TOKEN_KEY, token);
    } else {
        await AsyncStorage.removeItem(TOKEN_KEY);
    }
}

// Wrapper around fetch that automatically prepends API_URL and attaches the
// Authorization header. Use this for every backend call. The global fetch
// monkey-patch in _layout.jsx covers callers that still call fetch directly
// with a full URL, but new code should prefer apiFetch.
export async function apiFetch(path, init = {}) {
    const headers = new Headers(init.headers || {});
    if (_token && !headers.has("Authorization")) {
        headers.set("Authorization", `Bearer ${_token}`);
    }
    if (!headers.has("Content-Type") && init.body && typeof init.body === "string") {
        headers.set("Content-Type", "application/json");
    }
    const url = path.startsWith("http") ? path : `${API_URL}${path}`;
    return fetch(url, { ...init, headers });
}

// ── AUTH FLOWS ───────────────────────────────────────────────────────────────

export const registerUser = async (email, password, name = null) => {
    const response = await apiFetch(`/register`, {
        method: "POST",
        body: JSON.stringify({ email, password, ...(name && { name }) }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    return data;
};

export const loginUser = async (email, password) => {
    const response = await apiFetch(`/login`, {
        method: "POST",
        body: JSON.stringify({ email, password }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    await setAuthState(data.user, data.token);
    return data;
};

export const logoutUser = async () => {
    // Best-effort: tell the server to invalidate the token. Even if this
    // fails (offline, server down, etc.) we still clear local state so the
    // user appears logged out on this device.
    try {
        if (_token) {
            await apiFetch(`/logout`, { method: "POST" });
        }
    } catch {
        // ignore
    }
    await setAuthState(null, null);
};

// Re-fetch /me from the server and overwrite the cached user. Call on app
// focus and after privileged actions so the cached `role`/`managedOrgs`
// don't go stale (e.g. an admin promoted us to manager).
export const refreshUser = async () => {
    if (!_token) return null;
    try {
        const response = await apiFetch(`/me`);
        if (!response.ok) {
            // Token rejected — drop local state.
            if (response.status === 401) await setAuthState(null, null);
            return null;
        }
        const data = await response.json();
        await setAuthState(data.user, _token);
        return data.user;
    } catch {
        return null;
    }
};

export const getUser = async () => {
    if (!_bootstrapped) await bootstrapAuth();
    return _user;
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

export const getManagedOrgs = async () => {
    const user = await getUser();
    return user?.managedOrgs ?? [];
};

// Back-compat: returns first managed org or null. Prefer getManagedOrgs() in
// new code so we don't silently lose access to additional orgs.
export const getManagedOrg = async () => {
    const orgs = await getManagedOrgs();
    return orgs[0] ?? null;
};

// ── ADMIN: CLUB REQUESTS ─────────────────────────────────────────────────────
// Auth flows entirely through the bearer token now — no more adminUserId
// query/body params. The server resolves the caller from the token and
// enforces role === "admin".

export const listClubRequests = async (_unusedAdminId, status = "pending") => {
    const response = await apiFetch(`/admin/club-requests?status=${encodeURIComponent(status)}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    return data;
};

export const approveClubRequest = async (_unusedAdminId, requestId) => {
    const response = await apiFetch(`/admin/club-requests/${requestId}/approve`, {
        method: "POST",
        body: JSON.stringify({}),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    return data;
};

export const rejectClubRequest = async (_unusedAdminId, requestId, reason = null) => {
    const response = await apiFetch(`/admin/club-requests/${requestId}/reject`, {
        method: "POST",
        body: JSON.stringify(reason ? { reason } : {}),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    return data;
};

export const getOrgManagers = async (orgId) => {
    const response = await apiFetch(`/orgs/${orgId}/managers`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    return data;
};

// Add a manager to an org by email. Server enforces that the caller is
// already a manager of that org (or an admin).
export const addManagerByEmail = async (orgId, _unusedRequestingUserId, email) => {
    const response = await apiFetch(`/orgs/${orgId}/managers`, {
        method: "POST",
        body: JSON.stringify({ email }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    return data;
};

export const updateUser = async (userId, fields) => {
    const response = await apiFetch(`/users/${userId}`, {
        method: "PATCH",
        body: JSON.stringify(fields),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    await setAuthState(data.user, _token);
    return data.user;
};

// ── PUSH NOTIFICATIONS ───────────────────────────────────────────────────────

export const setPushToken = async (userId, pushToken) => {
    const response = await apiFetch(`/users/${userId}/push-token`, {
        method: "PATCH",
        body: JSON.stringify({ pushToken }),
    });
    if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? "Could not save push token");
    }
};

export const clearPushToken = async (userId) => {
    const response = await apiFetch(`/users/${userId}/push-token`, {
        method: "DELETE",
    });
    if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? "Could not clear push token");
    }
};

// ── PASSWORD CHANGE ──────────────────────────────────────────────────────────

export const changePassword = async (userId, currentPassword, newPassword) => {
    const response = await apiFetch(`/users/${userId}/password`, {
        method: "PATCH",
        body: JSON.stringify({ currentPassword, newPassword }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    if (data.token) {
        // Server rotated the token; replace ours so subsequent requests work.
        await setAuthState(_user, data.token);
    }
    return data;
};

// ── FOLLOW HELPERS ───────────────────────────────────────────────────────────

export const getFollowedOrgIds = async () => {
    const response = await apiFetch(`/follows`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? "Failed to load follows");
    return Array.isArray(data) ? data : [];
};

export const getFollowedOrgs = async () => {
    const response = await apiFetch(`/follows/orgs`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? "Failed to load follows");
    return Array.isArray(data) ? data : [];
};

export const followOrg = async (organizationId) => {
    const response = await apiFetch(`/follow`, {
        method: "POST",
        body: JSON.stringify({ organizationId }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    return data;
};

export const unfollowOrg = async (organizationId) => {
    const response = await apiFetch(`/follow`, {
        method: "DELETE",
        body: JSON.stringify({ organizationId }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    return data;
};

export const getFeed = async () => {
    const response = await apiFetch(`/feed`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? "Failed to load feed");
    return Array.isArray(data) ? data : [];
};

// ── CLUB REQUESTS (USER-FACING) ──────────────────────────────────────────────

export const submitClubRequest = async (clubName, description, location) => {
    const response = await apiFetch(`/club-requests`, {
        method: "POST",
        body: JSON.stringify({ clubName, description, location }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    return data;
};
