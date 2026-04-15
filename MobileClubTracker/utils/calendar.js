import * as Calendar from "expo-calendar";
import { Platform, Alert } from "react-native";

/**
 * Requests calendar permission.
 * Returns true if granted, false if denied (and shows a user-friendly alert).
 */
async function requestCalendarPermission() {
    const { status } = await Calendar.requestCalendarPermissionsAsync();
    if (status !== "granted") {
        Alert.alert(
            "Calendar Access Denied",
            "To save events, please enable Calendar access in your device settings.",
            [{ text: "OK" }]
        );
        return false;
    }
    return true;
}

/**
 * Finds the best calendar to write to.
 * - iOS: the default calendar set by the user in Settings
 * - Android: the primary Google account calendar
 */
async function getTargetCalendarId() {
    if (Platform.OS === "ios") {
        const defaultCalendar = await Calendar.getDefaultCalendarAsync();
        return defaultCalendar.id;
    }

    // Android — find the first writable local or Google calendar
    const calendars = await Calendar.getCalendarsAsync(
        Calendar.EntityTypes.EVENT
    );
    const target = calendars.find(
        (c) =>
            c.allowsModifications &&
            (c.source.type === Calendar.SourceType.LOCAL ||
                c.source.type === Calendar.SourceType.CALDAV ||
                c.source.name === "Google")
    );
    return target?.id ?? null;
}

/**
 * Adds a club event to the device calendar.
 *
 * @param {object} eventDetails
 * @param {string} eventDetails.title
 * @param {string} eventDetails.location
 * @param {string|Date} eventDetails.startDateTime  ISO string or Date object
 * @param {string} eventDetails.clubName
 */
export async function addEventToCalendar({ title, location, startDateTime, clubName }) {
    const granted = await requestCalendarPermission();
    if (!granted) return;

    const calendarId = await getTargetCalendarId();
    if (!calendarId) {
        Alert.alert("No Calendar Found", "We couldn't find a writable calendar on your device.");
        return;
    }

    const start = new Date(startDateTime);
    // Default event duration: 1 hour
    const end = new Date(start.getTime() + 60 * 60 * 1000);

    try {
        await Calendar.createEventAsync(calendarId, {
            title,
            location: location ?? "",
            notes: `Event hosted by ${clubName}`,
            startDate: start,
            endDate: end,
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            alarms: [{ relativeOffset: -30 }], // 30-min reminder
        });

        Alert.alert(
            "Added to Calendar ✓",
            `"${title}" has been saved to your calendar with a 30-minute reminder.`,
            [{ text: "Great!" }]
        );
    } catch (err) {
        console.error("Calendar error:", err);
        Alert.alert("Error", "Could not add event to calendar. Please try again.");
    }
}