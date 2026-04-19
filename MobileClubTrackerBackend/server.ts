import "dotenv/config";
import express from "express";
import cors from "cors";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client.ts";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const app = express();
app.use(cors());
app.use(express.json());

// ── AUTH ──────────────────────────────────────────────────────────────────────

app.post("/register", async (req, res) => {
    const { email, password, name } = req.body;
    try {
        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) return res.status(400).json({ error: "Email already registered" });
        await prisma.user.create({ data: { email, password, ...(name?.trim() && { name: name.trim() }) } });
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

app.post("/login", async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await prisma.user.findFirst({
            where: { email, password },
            select: {
                id: true,
                email: true,
                name: true,
                createdAt: true,
                // CHANGED: added role and managedOrg to the response so the
                // frontend knows if the user is a manager and which club they manage
                role: true,
                managedOrg: {
                    select: { id: true, name: true, description: true },
                },
            },
        });
        if (!user) return res.status(401).json({ error: "Invalid email or password" });
        res.json({ success: true, user });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

// ── ORGS ──────────────────────────────────────────────────────────────────────

// List all orgs with follower counts
app.get("/orgs", async (_req, res) => {
    try {
        const orgs = await prisma.organization.findMany({
            orderBy: { name: "asc" },
            include: { _count: { select: { followers: true } } },
        });
        res.json(orgs);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

// Get a single org with follower count
app.get("/orgs/:orgId", async (req, res) => {
    const orgId = parseInt(req.params.orgId);
    if (isNaN(orgId)) return res.status(400).json({ error: "Invalid org id" });
    try {
        const org = await prisma.organization.findUnique({
            where: { id: orgId },
            include: { _count: { select: { followers: true } } },
        });
        if (!org) return res.status(404).json({ error: "Org not found" });
        res.json(org);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

// Get events + announcements for a single org, merged and sorted newest first
app.get("/orgs/:orgId/posts", async (req, res) => {
    const orgId = parseInt(req.params.orgId);
    if (isNaN(orgId)) return res.status(400).json({ error: "Invalid org id" });
    try {
        const [events, announcements] = await Promise.all([
            prisma.event.findMany({
                where: { organizationId: orgId },
                orderBy: { createdAt: "desc" },
            }),
            prisma.announcement.findMany({
                where: { organizationId: orgId },
                orderBy: { createdAt: "desc" },
            }),
        ]);

        const posts = [
            ...events.map((e) => ({ ...e, type: "event" as const })),
            ...announcements.map((a) => ({ ...a, type: "announcement" as const })),
        ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        res.json(posts);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

// CHANGED: new route — allows a manager to create an event for their org
app.post("/orgs/:orgId/events", async (req, res) => {
    const orgId = parseInt(req.params.orgId);
    if (isNaN(orgId)) return res.status(400).json({ error: "Invalid org id" });
    const { title, location, startDateTime } = req.body;
    try {
        const event = await prisma.event.create({
            data: {
                title,
                location,
                startDateTime: new Date(startDateTime),
                organizationId: orgId,
            },
        });
        // ── NEW: send push to all followers ──
        const org = await prisma.organization.findUnique({ where: { id: orgId } });
        const followers = await prisma.follow.findMany({
            where: { organizationId: orgId },
            include: { user: { select: { pushToken: true } } },
        });
        const tokens = followers.map((f) => f.user.pushToken).filter(Boolean);
        if (tokens.length > 0) {
            await fetch("https://exp.host/--/api/v2/push/send", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(
                    tokens.map((token) => ({
                        to: token,
                        title: `📅 New event from ${org?.name}`,
                        body: `${title} · 📍 ${location}`,
                        sound: "default",
                    }))
                ),
            });
        }
        // ── END NEW ──
        res.json(event);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

// CHANGED: new route — allows a manager to create an announcement for their org
app.post("/orgs/:orgId/announcements", async (req, res) => {
    const orgId = parseInt(req.params.orgId);
    if (isNaN(orgId)) return res.status(400).json({ error: "Invalid org id" });
    const { title, body } = req.body;
    try {
        const announcement = await prisma.announcement.create({
            data: {
                title,
                body,
                organizationId: orgId,
            },
        });
        // ── NEW: send push to all followers ──
        const org = await prisma.organization.findUnique({ where: { id: orgId } });
        const followers = await prisma.follow.findMany({
            where: { organizationId: orgId },
            include: { user: { select: { pushToken: true } } },
        });
        const tokens = followers.map((f) => f.user.pushToken).filter(Boolean);
        if (tokens.length > 0) {
            await fetch("https://exp.host/--/api/v2/push/send", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(
                    tokens.map((token) => ({
                        to: token,
                        title: `📢 New announcement from ${org?.name}`,
                        body: `${title} · 📝 ${body}`,
                        sound: "default",
                    }))
                ),
            });
        }
        // ── END NEW ──
        res.json(announcement);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

// CHANGED: new route — allows a manager to delete an event for their org
app.delete("/events/:eventId", async (req, res) => {
    const eventId = parseInt(req.params.eventId);
    if (isNaN(eventId)) return res.status(400).json({ error: "Invalid event id" });
    try {
        await prisma.event.delete({ where: { id: eventId } });
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

// CHANGED: new route — allows a manager to delete an announcement for their org
app.delete("/announcements/:announcementId", async (req, res) => {
    const announcementId = parseInt(req.params.announcementId);
    if (isNaN(announcementId)) return res.status(400).json({ error: "Invalid announcement id" });
    try {
        await prisma.announcement.delete({ where: { id: announcementId } });
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

// CHANGED: new route — allows a manager to update their org's description
app.patch("/orgs/:orgId", async (req, res) => {
    const orgId = parseInt(req.params.orgId);
    if (isNaN(orgId)) return res.status(400).json({ error: "Invalid org id" });
    const { description, name, imageUrl } = req.body;
    try {
        const org = await prisma.organization.update({
            where: { id: orgId },
            data: {
                ...(description !== undefined && { description }),
                ...(name !== undefined && { name }),
                ...(imageUrl !== undefined && { imageUrl }),
            },
            include: { _count: { select: { followers: true } } },
        });
        res.json(org);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

// CHANGED: update user profile info (name, imageUrl)
app.patch("/users/:userId", async (req, res) => {
    const userId = parseInt(req.params.userId);
    const { imageUrl, name } = req.body;
    try {
        const user = await prisma.user.update({
            where: { id: userId },
            data: {
                ...(name !== undefined && { name }),
                ...(imageUrl !== undefined && { imageUrl }),
            },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                imageUrl: true,
                managedOrg: { select: { id: true, name: true, description: true } },
            },
        });
        // CHANGED: update AsyncStorage with new user data so app reflects changes immediately
        res.json({ success: true, user });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

// CHANGED: update user password
app.patch("/users/:userId/password", async (req, res) => {
    const userId = parseInt(req.params.userId);
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: "Both current and new password are required" });
    }
    if (newPassword.length < 6) {
        return res.status(400).json({ error: "New password must be at least 6 characters" });
    }
    try {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user || user.password !== currentPassword) {
            return res.status(401).json({ error: "Current password is incorrect" });
        }
        await prisma.user.update({ where: { id: userId }, data: { password: newPassword } });
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

// CHANGED: update user's push notification token for mobile notifications
app.patch("/users/:userId/push-token", async (req, res) => {
    const userId = parseInt(req.params.userId);
    const { pushToken } = req.body;
    try {
        await prisma.user.update({
            where: { id: userId },
            data: { pushToken },
        });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});

// CHANGED: new route — user submits a request to become a club manager
app.post("/club-requests", async (req, res) => {
    const { userId, clubName, description, location } = req.body;
    try {
        const existing = await prisma.clubRequest.findFirst({
            where: { userId, status: "pending" }
        });
        if (existing) return res.status(400).json({ error: "You already have a pending request" });

        const request = await prisma.clubRequest.create({
            data: { userId, clubName, description, location }
        });
        res.json(request);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

/* ADMINS can view pending club requests with this query:
SELECT r.id, u.email, r."clubName", r.description, r.location, r.status
FROM "ClubRequest" r
JOIN "User" u ON u.id = r."userId"
WHERE r.status = 'pending';

-- See pending requests
SELECT r.id, u.email, r."clubName" FROM "ClubRequest" r
JOIN "User" u ON u.id = r."userId" WHERE r.status = 'pending';

-- Approve (replace IDs)
UPDATE "User" SET role = 'manager' WHERE id = <userId>;
UPDATE "Organization" SET "managerId" = <userId> WHERE id = <orgId>;
UPDATE "ClubRequest" SET status = 'approved' WHERE id = <requestId>;
*/

// ── FOLLOWS ───────────────────────────────────────────────────────────────────

// List all orgIds the user follows
app.get("/follows/:userId", async (req, res) => {
    const userId = parseInt(req.params.userId);
    if (isNaN(userId)) return res.status(400).json({ error: "Invalid user id" });
    try {
        const follows = await prisma.follow.findMany({ where: { userId } });
        res.json(follows.map((f) => f.organizationId));
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

// Full org objects (with follower counts) for orgs the user follows
app.get("/follows/:userId/orgs", async (req, res) => {
    const userId = parseInt(req.params.userId);
    if (isNaN(userId)) return res.status(400).json({ error: "Invalid user id" });
    try {
        const follows = await prisma.follow.findMany({ where: { userId } });
        const orgIds = follows.map((f) => f.organizationId);
        const orgs = await prisma.organization.findMany({
            where: { id: { in: orgIds } },
            orderBy: { name: "asc" },
            include: { _count: { select: { followers: true } } },
        });
        res.json(orgs);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

// Follow an org
app.post("/follow", async (req, res) => {
    const { userId, organizationId } = req.body;
    try {
        await prisma.follow.create({ data: { userId, organizationId } });
        res.json({ success: true });
    } catch (err: any) {
        if (err.code === "P2002") return res.status(400).json({ error: "Already following" });
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

// Unfollow an org
app.delete("/follow", async (req, res) => {
    const { userId, organizationId } = req.body;
    try {
        await prisma.follow.delete({
            where: { userId_organizationId: { userId, organizationId } },
        });
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

// ── FEED ──────────────────────────────────────────────────────────────────────

// Events + announcements from orgs the user follows, sorted newest first
app.get("/feed/:userId", async (req, res) => {
    const userId = parseInt(req.params.userId);
    if (isNaN(userId)) return res.status(400).json({ error: "Invalid user id" });
    try {
        const follows = await prisma.follow.findMany({ where: { userId } });
        const orgIds = follows.map((f) => f.organizationId);

        const [events, announcements] = await Promise.all([
            prisma.event.findMany({
                where: { organizationId: { in: orgIds } },
                include: { organization: { select: { name: true } } },
                orderBy: { createdAt: "desc" },
            }),
            prisma.announcement.findMany({
                where: { organizationId: { in: orgIds } },
                include: { organization: { select: { name: true } } },
                orderBy: { createdAt: "desc" },
            }),
        ]);

        const feed = [
            ...events.map((e) => ({ ...e, type: "event" as const })),
            ...announcements.map((a) => ({ ...a, type: "announcement" as const })),
        ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        res.json(feed);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

app.listen(3000, "0.0.0.0", () => console.log("Server running on port 3000"));