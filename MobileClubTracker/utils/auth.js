import AsyncStorage from "@react-native-async-storage/async-storage";

// Use your computer's local IP (not localhost!) so your phone can reach it
// Run `ipconfig` (Windows) or `ifconfig` (Mac) to find it
export const API_URL = "http://172.31.197.85:3000"; // <--- replace with your IP

const USER_KEY = "loggedInUser";

export const registerUser = async (email, password) => {
    const response = await fetch(`${API_URL}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
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
