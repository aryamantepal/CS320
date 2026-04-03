// components/ClubCard.jsx
import React from "react";
import {
    View,
    Text,
    Image,
    Pressable,
    StyleSheet,
    Dimensions,
    useColorScheme,
} from "react-native";
import { Colors } from "../constants/Colors";

// We divide screen width by 3 columns, subtracting margins to get the tile size.
// This math ensures the grid always fits perfectly regardless of screen size.
const SCREEN_WIDTH = Dimensions.get("window").width;
const NUM_COLUMNS = 3;
const TILE_MARGIN = 6;
const TILE_SIZE = (SCREEN_WIDTH - TILE_MARGIN * (NUM_COLUMNS + 1)) / NUM_COLUMNS;

export default function ClubCard({ club, onPress }) {
    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme] ?? Colors.light;

    return (
        <Pressable
            onPress={onPress}
            style={({ pressed }) => [
                styles.tile,
                { margin: TILE_MARGIN / 2, opacity: pressed ? 0.7 : 1 }
            ]}
        >
            {/* Profile picture — square with rounded corners, like Instagram */}
            <Image
                source={
                    club.profilePicture
                        ? { uri: club.profilePicture }
                        : require("../assets/adaptive-icon.png")
                }
                style={styles.image}
            />

            {/* Club name below the image */}
            <Text
                style={[styles.name, { color: theme.text }]}
                numberOfLines={1} // truncates long names with "..." instead of wrapping
            >
                {club.name}
            </Text>

            {/* Follower count in a smaller, muted style */}
            <Text style={[styles.followers, { color: theme.iconColor }]}>
                {club.followers} followers
            </Text>
        </Pressable>
    );
}

// Export TILE_SIZE and NUM_COLUMNS so explore.jsx can use them in FlatList
export { TILE_SIZE, NUM_COLUMNS, TILE_MARGIN };

const styles = StyleSheet.create({
    tile: {
        width: TILE_SIZE,
        alignItems: "center",
    },
    image: {
        width: TILE_SIZE,
        height: TILE_SIZE,
        borderRadius: 12,  // slightly rounded corners like Instagram
        backgroundColor: "#ccc",
        marginBottom: 4,
    },
    name: {
        fontSize: 12,
        fontWeight: "600",
        textAlign: "center",
        width: TILE_SIZE,
        paddingHorizontal: 2,
    },
    followers: {
        fontSize: 11,
        textAlign: "center",
        marginTop: 1,
    },
});