import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import Constants from "expo-constants";
import { setPushToken } from "./auth";

export async function registerForPushNotifications(userId) {
    // Push notifications don't work on emulators/simulators
    if (!Device.isDevice) {
        alert("Push notifications only work on a real device.");
        return null;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }

    if (finalStatus !== "granted") {
        return null;
    }

    if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("default", {
            name: "default",
            importance: Notifications.AndroidImportance.MAX,
        });
    }

    const projectId =
        Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;

    // Persist on the server. Goes through apiFetch so the bearer token is
    // attached automatically — the previous version called fetch directly
    // and would have failed once the backend started requiring auth.
    await setPushToken(userId, token);

    return token;
}
