// app/(tabs)/explore.jsx
import React, { useState } from "react";
import {
    Text,
    FlatList,
    StyleSheet,
    useColorScheme,
    KeyboardAvoidingView,
    Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { Colors } from "../../constants/Colors";
import ThemedView from "../../components/ThemedView";
import SearchBar from "../../components/SearchBar";
import ClubCard, { NUM_COLUMNS, TILE_MARGIN } from "../../components/ClubCard";

// Import test data — replace with real API fetch later
import { testUser } from "../../test/testInstances";

export default function Explore() {
    const router = useRouter();
    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme] ?? Colors.light;

    const [query, setQuery] = useState("");

    // Get all clubs from all clubs the user follows — later this will come
    // from an API call that returns ALL clubs in the system, not just followed ones.
    // For now, we use the test data we have.
    const allClubs = testUser.listFollowedClubs();

    // Derived state: filter the full club list based on the search query.
    // We convert both to lowercase so "chess" matches "Chess Club" etc.
    // When query is empty, filteredClubs === allClubs, showing everything.
    const filteredClubs = allClubs.filter(club =>
        club.name.toLowerCase().includes(query.toLowerCase())
    );

    return (
        <ThemedView safe={true}>
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === "ios" ? "padding" : undefined}
            >
                <Text style={[styles.heading, { color: theme.text }]}>
                    Explore
                </Text>

                {/* Search bar — drives the filter above */}
                <SearchBar
                    value={query}
                    onChangeText={setQuery}
                    placeholder="Search clubs..."
                />

                {/*
                    FlatList is better than ScrollView + map() for grids because:
                    1. It only renders tiles that are currently visible (virtualization)
                    2. numColumns handles row layout automatically
                    3. It has built-in empty state handling via ListEmptyComponent
                */}
                <FlatList
                    data={filteredClubs}
                    keyExtractor={(item, index) => index.toString()}
                    numColumns={NUM_COLUMNS}

                    // This renders between columns to create even spacing
                    columnWrapperStyle={{ marginHorizontal: TILE_MARGIN / 2 }}

                    renderItem={({ item }) => (
                        <ClubCard
                            club={item}
                            onPress={() => {
                                // Navigate to club detail page later
                                console.log("Tapped:", item.name);
                            }}
                        />
                    )}

                    // Shows when no clubs match the search query
                    ListEmptyComponent={
                        <Text style={[styles.emptyText, { color: theme.iconColor }]}>
                            No clubs found for "{query}"
                        </Text>
                    }

                    // Enough padding at the bottom so the last row clears the tab bar
                    contentContainerStyle={{ paddingBottom: 120 }}

                    // Dismisses keyboard when user scrolls down, which feels natural
                    keyboardDismissMode="on-drag"
                    showsVerticalScrollIndicator={false}
                />
            </KeyboardAvoidingView>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    heading: {
        fontSize: 28,
        fontWeight: "700",
        marginBottom: 12,
    },
    emptyText: {
        textAlign: "center",
        marginTop: 40,
        fontSize: 15,
        fontStyle: "italic",
    },
});