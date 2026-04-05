import React, { useState, useEffect } from "react";
import {
    Text,
    FlatList,
    StyleSheet,
    useColorScheme,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { Colors } from "../../constants/Colors";
import ThemedView from "../../components/ThemedView";
import SearchBar from "../../components/SearchBar";
import ClubCard, { NUM_COLUMNS, TILE_MARGIN, CONTAINER_PADDING } from "../../components/ClubCard";
import { API_URL } from "../../utils/auth";

export default function Explore() {
    const router = useRouter();
    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme] ?? Colors.light;

    const [query, setQuery] = useState("");
    const [orgs, setOrgs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadOrgs = async () => {
            try {
                const res = await fetch(`${API_URL}/orgs`);
                const data = await res.json();
                setOrgs(data);
            } catch (err) {
                console.error("Failed to load orgs:", err);
            } finally {
                setLoading(false);
            }
        };
        loadOrgs();
    }, []);

    const filteredOrgs = orgs.filter((org) =>
        org.name.toLowerCase().includes(query.toLowerCase())
    );

    if (loading) {
        return (
            <ThemedView safe={true} style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
                <ActivityIndicator size="large" />
            </ThemedView>
        );
    }

    return (
        <ThemedView safe={true} style={styles.container}>
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === "ios" ? "padding" : undefined}
            >
                <Text style={[styles.heading, { color: theme.text }]}>Explore</Text>

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
                                profilePicture: null,
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
                    contentContainerStyle={{ paddingBottom: 120 }}
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
});
