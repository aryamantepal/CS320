import React from "react";
import { View, Text, ScrollView } from "react-native";

import ThemedCard from "../../components/ThemedCard";

import { Club, Post, User } from "../../test/testObj.js"; // for testing purposes, will replace with actual data fetching later

import {
    testUser
} from "../../test/testInstances.js"; // for testing purposes, will replace with actual data fetching later

export default function Home() {

    const listToCards = (feed) => {
        return feed.map((item, index) => (
            <ThemedCard key={index} style={{ margin: 10 }}>
                <Text>{item}</Text>
            </ThemedCard>
        ));
    }

    const testFeed = ["Event 1", "Announcement 1", "Event 2", "Announcement 2"];

    const generateFeed = (user) => {
        const feedItems = [];

        user.listFollowedClubs().forEach(club => {
            club.posts.forEach(post => {
                feedItems.push(`${club.name}: ${post.name}`);
            });
        });

        // Sort feed items by some criteria (e.g., most recent first)
        // For now, we'll just return them in the order they were added
        return feedItems;
    }

    const feed = generateFeed(testUser); // replace with generateFeed() when implemented

    return (
        <View style={{ padding: 20 }}>
            <ScrollView>
                {listToCards(feed)}
            </ScrollView>
        </View>
    );
}