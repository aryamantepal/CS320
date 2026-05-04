import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import { decode } from "base64-arraybuffer";
import { supabase } from "./supabase";

/**
 * Opens the image library, uploads the chosen image to Supabase Storage,
 * and returns the public URL. Returns null if the user cancels.
 *
 * @param {string} bucket  - Supabase Storage bucket name (e.g. "club-images")
 * @param {string} path    - File path inside the bucket (e.g. "orgs/42.jpg")
 */
export async function pickAndUploadImage(bucket, path) {
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

    // Read file as base64 then decode to ArrayBuffer — required on iOS
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
