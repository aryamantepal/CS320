import React, { useState, useCallback } from "react";
import {
    Text,
    FlatList,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import ThemedView from "../../components/ThemedView";
import SearchBar from "../../components/SearchBar";
import ClubCard, { NUM_COLUMNS, TILE_MARGIN, CONTAINER_PADDING } from "../../components/ClubCard";
import { API_URL, getManagedOrg } from "../../utils/auth";
import { useTheme } from "../../context/ThemeContext";

export default function Explore() {
    const router = useRouter();
    const { theme, isDarkMode} = useTheme();

    const [query, setQuery] = useState("");
    const [orgs, setOrgs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [managedOrgId, setManagedOrgId] = useState(null);

    useFocusEffect(
        useCallback(() => {
            const loadOrgs = async () => {
                setLoading(true);
                try {
                    const [res, managedOrg] = await Promise.all([
                        fetch(`${API_URL}/orgs`),
                        getManagedOrgs(),
                    ]);

                    const data = await res.json();
                    setOrgs(Array.isArray(data) ? data : []);
                    setManagedIds(new Set((managedOrgs ?? []).map((o) => o.id)));
                } catch (err) {
                    console.error("Failed to load orgs:", err);
                } finally {
                    setLoading(false);
                }
            };

            loadOrgs();
        }, [])
    );

    const filteredOrgs = orgs.filter((org) => {
        if (org.id === managedOrgId) return false;

        const q = query.toLowerCase();
        return (
            org.name.toLowerCase().includes(q) ||
            (org.description ?? "").toLowerCase().includes(q)
        );
    });

    if (loading) {
        return (
            <ThemedView style={styles.center}>
                <ActivityIndicator size="large" color={theme.text} />
            </ThemedView>
        );
    }

    return (
        <ThemedView style={[styles.container, { backgroundColor: theme.background }]}>
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === "ios" ? "padding" : undefined}
            >
                <Text style={[styles.heading, { color: theme.text }]}>
                    Explore
                </Text>

                <SearchBar
                    value={query}
                    onChangeText={setQuery}
                    placeholder="Search clubs..."
                />

                <FlatList
                    data={filteredOrgs}
                    keyExtractor={(item) => item.id.toString()}
                    numColumns={NUM_COLUMNS}
                    columnWrapperStyle={{ marginHorizontal: TILE_MARGIN / 2 }}
                    renderItem={({ item }) => (
                        <ClubCard
                            club={{
                                name: item.name,
                                followers: item._count?.followers ?? 0,
                                profilePicture: item.imageUrl ?? null,
                            }}
                            onPress={() =>
                                router.push({
                                    pathname: "/clubProfile",
                                    params: { id: item.id, name: item.name },
                                })
                            }
                        />
                    )}
                    ListEmptyComponent={
                        <Text style={[styles.emptyText, { color: theme.iconColor }]}>
                            No clubs found for "{query}"
                        </Text>
                    }
                    contentContainerStyle={[
                        { paddingBottom: 120 },
                        filteredOrgs.length === 0 && styles.emptyContainer
                    ]}
                    style={{ backgroundColor: theme.background }}
                    keyboardDismissMode="on-drag"
                    showsVerticalScrollIndicator={false}
                />
            </KeyboardAvoidingView>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: CONTAINER_PADDING,
    },
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
    center: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    emptyContainer: {
        flexGrow: 1,
        justifyContent: "center",
    },
});