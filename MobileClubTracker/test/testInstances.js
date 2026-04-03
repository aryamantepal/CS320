import { Club, Post, User } from "./testObj.js";

// -------------------- CLUBS --------------------

const testClub = new Club(
    "Chess Club",
    "Alice Smith",
    "https://example.com/chess-club-banner.jpg",
    "https://example.com/chess-club-profile.jpg",
    "A club for chess enthusiasts of all skill levels.",
    ["chess", "strategy", "fun"],
    150
);

const testClub2 = new Club(
    "Robotics Club",
    "David Kim",
    "https://example.com/robotics-banner.jpg",
    "https://example.com/robotics-profile.jpg",
    "We build robots and compete in engineering challenges.",
    ["robotics", "engineering", "coding"],
    220
);

const testClub3 = new Club(
    "Book Club",
    "Emma Johnson",
    "https://example.com/bookclub-banner.jpg",
    "https://example.com/bookclub-profile.jpg",
    "A community for readers who love discussing books.",
    ["reading", "literature", "discussion"],
    95
);

// -------------------- EVENT POSTS --------------------

const testPostEvent = new Post({
    type: "event",
    name: "Chess Tournament",
    clubName: "Chess Club",
    date: "2024-07-15",
    timeSincePosted: "2 days ago",
    time: "3:00 PM - 6:00 PM",
    description: "Join us for a fun and competitive chess tournament! Open to all skill levels."
});

const testPostEvent2 = new Post({
    type: "event",
    name: "Robot Battle Showcase",
    clubName: "Robotics Club",
    date: "2024-08-01",
    timeSincePosted: "1 day ago",
    time: "5:00 PM - 8:00 PM",
    description: "Watch student-built robots compete in exciting challenges."
});

const testPostEvent3 = new Post({
    type: "event",
    name: "Book Discussion Night",
    clubName: "Book Club",
    date: "2024-07-20",
    timeSincePosted: "3 hours ago",
    time: "6:30 PM - 8:00 PM",
    description: "We will discuss this month's selected novel together."
});

// -------------------- ANNOUNCEMENTS --------------------

const testPostAnnouncement = new Post({
    type: "announcement",
    name: "New Chess Sets Available",
    clubName: "Chess Club",
    date: "2024-07-10",
    timeSincePosted: "5 days ago",
    content: "We have new chess sets available for club members to use during meetings!"
});

const testPostAnnouncement2 = new Post({
    type: "announcement",
    name: "Robotics Lab Hours Extended",
    clubName: "Robotics Club",
    date: "2024-07-12",
    timeSincePosted: "3 days ago",
    content: "The robotics lab will now stay open until 10 PM on weekdays."
});

const testPostAnnouncement3 = new Post({
    type: "announcement",
    name: "Next Book Selected",
    clubName: "Book Club",
    date: "2024-07-18",
    timeSincePosted: "6 hours ago",
    content: "Our next book is '1984' by George Orwell. Start reading!"
});

// -------------------- USERS --------------------

const testUser = new User(
    "John Doe",
    "https://example.com/john-doe-profile.jpg",
    [testClub, testClub2]
);

const testUser2 = new User(
    "Sarah Lee",
    "https://example.com/sarah-lee-profile.jpg",
    [testClub2, testClub]
);

const testUser3 = new User(
    "Michael Brown",
    "https://example.com/michael-brown-profile.jpg",
    [testClub3]
);

// -------------------- EXPORT --------------------

testClub.addPost(testPostEvent);
testClub.addPost(testPostAnnouncement);

testClub2.addPost(testPostEvent2);
testClub2.addPost(testPostAnnouncement2);

testClub3.addPost(testPostEvent3);
testClub3.addPost(testPostAnnouncement3);

export {
    testClub,
    testClub2,
    testClub3,
    testPostEvent,
    testPostEvent2,
    testPostEvent3,
    testPostAnnouncement,
    testPostAnnouncement2,
    testPostAnnouncement3,
    testUser,
    testUser2,
    testUser3
};