class Club {
    constructor(name, manager, banner, profilePicture, description, tags, followers, posts = []) {
        this.name = name;
        this.manager = manager;
        this.banner = banner;
        this.profilePicture = profilePicture;
        this.description = description;
        this.tags = tags;
        this.followers = followers;
        this.posts = posts;

    }

    addPost(post) {
        this.posts.push(post);
    }

    follow() {
        this.followers += 1;
    }

    unfollow() {
        if (this.followers > 0) {
            this.followers -= 1;
        }
    }

    listAllPosts() {
        return this.posts;
    }
}

class Post {
    constructor(data) {
        this.type = data.type; // "event" or "announcement"

        this.name = data.name;
        this.clubName = data.clubName;
        this.date = data.date;
        this.timeSincePosted = data.timeSincePosted;

        if (this.type === "event") {
            this.time = data.time;
            this.description = data.description;
        }

        if (this.type === "announcement") {
            this.content = data.content;
        }

    }
}

class User {
    constructor(name, profilePicture, followedClubs = []) {
        this.name = name;
        this.profilePicture = profilePicture;
        this.followedClubs = followedClubs;
    }

    followClub(club) {
        if (!this.followedClubs.includes(club)) {
            this.followedClubs.push(club);
            club.follow();
        }
    }

    unfollowClub(club) {
        const index = this.followedClubs.indexOf(club);
        if (index !== -1) {
            this.followedClubs.splice(index, 1);
            club.unfollow();
        }
    }

    listFollowedClubs() {
        return this.followedClubs;
    }
}

export { Club, Post, User };