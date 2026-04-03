import React from "react";
import { ScrollView } from "react-native";

import ThemedCard from "../../components/ThemedCard";

import { Club, Post, User } from "../../test/testObj.js"; // for testing purposes, will replace with actual data fetching later

import {
    testUser
} from "../../test/testInstances.js"; // for testing purposes, will replace with actual data fetching later
import ThemedView from "../../components/ThemedView.jsx";

export default function Home() {

    const generateFeed = (user) => {
        const feedItems = [];
        user.listFollowedClubs().forEach(club => {
            club.posts.forEach(post => {
                feedItems.push({ club, post }); // <--- keep the full objects
            });
        });
        return feedItems;
    };

    const feed = generateFeed(testUser);

    return (
        <ThemedView style={{paddingHorizontal: 20}} safe={true}>
            <ScrollView style={{ backgroundColor: "transparent" }}
                        contentContainerStyle={{ paddingBottom: 0 }} // add some padding at the bottom
            >
                {feed.map((item, index) => (
                    <ThemedCard
                        key={index}
                        image={item.club.profilePicture}   // Club has profilePicture, not image
                        clubName={item.club.name}
                        title={item.post.name}
                        subtitle={
                            item.post.type === "event"
                                ? item.post.description         // events have description
                                : item.post.content             // announcements have content
                        }
                        onPress={() => console.log("Pressed", item.post.name)}
                    />
                ))}
            </ScrollView>
        </ThemedView>
    );
}