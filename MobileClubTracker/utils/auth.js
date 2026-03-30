import AsyncStorage from "@react-native-async-storage/async-storage";

const USER_KEY = "loggedInUser";

export const loginUser = async (email) => {
    await AsyncStorage.setItem(USER_KEY, email);
};

export const logoutUser = async () => {
    await AsyncStorage.removeItem(USER_KEY);
};

export const getUser = async () => {
    return await AsyncStorage.getItem(USER_KEY);
};