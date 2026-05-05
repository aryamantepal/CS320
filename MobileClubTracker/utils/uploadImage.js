import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import { decode } from "base64-arraybuffer";
import { supabase } from "./supabase";

// Whitelist of (bucket, prefix) tuples that the app is allowed to write to.
// We refuse to upload anything outside these prefixes so a careless caller
// (or a tampered client) can't drop arbitrary objects into other paths.
const ALLOWED = [
    { bucket: "club-images", prefix: "users/" },
    { bucket: "club-images", prefix: "orgs/" },
];

function pathIsAllowed(bucket, path) {
    return ALLOWED.some(
        (a) =>
            a.bucket === bucket &&
            typeof path === "string" &&
            path.startsWith(a.prefix) &&
            !path.includes("..")
    );
}

/**
 * Opens the image library, uploads the chosen image to Supabase Storage,
 * and returns the public URL. Returns null if the user cancels.
 *
 * @param {string} bucket  - Supabase Storage bucket name (e.g. "club-images")
 * @param {string} path    - File path inside the bucket (e.g. "orgs/42.jpg")
 */
export async function pickAndUploadImage(bucket, path) {
    if (!pathIsAllowed(bucket, path)) {
        throw new Error("Upload path is not allowed.");
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
        throw new Error("Permission to access photo library was denied.");
    }

    const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
    });

    if (result.canceled) return null;

    const uri = result.assets[0].uri;

    const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: "base64",
    });

    const { error } = await supabase.storage
        .from(bucket)
        .upload(path, decode(base64), { contentType: "image/jpeg", upsert: true });

    if (error) throw new Error(error.message);

    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return `${data.publicUrl}?t=${Date.now()}`;
}
