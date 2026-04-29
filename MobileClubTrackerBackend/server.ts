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

// ── ADMIN HELPER ──────────────────────────────────────────────────────────────
// Looks up the caller by `adminUserId` (from body, query, or x-admin-user-id header)
// and confirms their role is "admin". Returns the admin user on success, or sends
// a 401/403 response and returns null. Callers MUST check the return value.
async function requireAdmin(req: express.Request, res: express.Response) {
    const raw =
        req.body?.adminUserId ??
        req.query?.adminUserId ??
        req.header("x-admin-user-id");
    const adminUserId = raw !== undefined && raw !== null ? parseInt(String(raw)) : NaN;
    if (isNaN(adminUserId)) {
        res.status(401).json({ error: "Missing adminUserId" });
        return null;
    }
    const admin = await prisma.user.findUnique({ where: { id: adminUserId } });
    if (!admin || admin.role !== "admin") {
        res.status(403).json({ error: "Forbidden: admin role required" });
        return null;
    }
    return admin;
}

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
                imageUrl: true,
                createdAt: true,
                role: true,
                // managedOrgs is now a list (one manager can run multiple clubs)
                managedOrgs: {
                    select: { id: true, name: true, description: true, imageUrl: true },
                    orderBy: { name: "asc" },
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
                managedOrgs: {
                    select: { id: true, name: true, description: true, imageUrl: true },
                    orderBy: { name: "asc" },
                },
            },
        });
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

// ── ADMIN: CLUB REQUESTS ──────────────────────────────────────────────────────
// Admins are assigned manually in the DB (UPDATE "User" SET role = 'admin' ...).
// All admin routes require `adminUserId` (body/query/header) — see requireAdmin.

// List club requests, newest first. Optional ?status=pending|approved|rejected|all (default pending).
app.get("/admin/club-requests", async (req, res) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    const status = (req.query.status as string | undefined) ?? "pending";
    const where = status === "all" ? {} : { status };
    try {
        const requests = await prisma.clubRequest.findMany({
            where,
            orderBy: { createdAt: "desc" },
            include: {
                user: { select: { id: true, name: true, email: true, imageUrl: true, role: true } },
                reviewedBy: { select: { id: true, name: true, email: true } },
            },
        });
        res.json(requests);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

// Approve a club request: create the Organization, promote the user to "manager"
// (unless already admin), link the user as the org's manager, mark request approved.
// Runs in a transaction so partial failures don't leave the DB half-updated.
app.post("/admin/club-requests/:id/approve", async (req, res) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    const requestId = parseInt(req.params.id);
    if (isNaN(requestId)) return res.status(400).json({ error: "Invalid request id" });
    try {
        const result = await prisma.$transaction(async (tx) => {
            const request = await tx.clubRequest.findUnique({ where: { id: requestId } });
            if (!request) throw new Error("NOT_FOUND");
            if (request.status !== "pending") throw new Error("ALREADY_REVIEWED");

            // Enforce unique org name (same constraint as Organization.name @unique).
            const nameClash = await tx.organization.findUnique({ where: { name: request.clubName } });
            if (nameClash) throw new Error("NAME_TAKEN");

            const org = await tx.organization.create({
                data: {
                    name: request.clubName,
                    description: request.description,
                    managerId: request.userId,
                },
            });

            // Only bump role if they aren't already admin (admins stay admins).
            const requester = await tx.user.findUnique({ where: { id: request.userId } });
            if (requester && requester.role !== "admin") {
                await tx.user.update({
                    where: { id: request.userId },
                    data: { role: "manager" },
                });
            }

            const updated = await tx.clubRequest.update({
                where: { id: requestId },
                data: {
                    status: "approved",
                    reviewedAt: new Date(),
                    reviewedById: admin.id,
                },
                include: {
                    user: { select: { id: true, name: true, email: true } },
                    reviewedBy: { select: { id: true, name: true, email: true } },
                },
            });

            return { request: updated, organization: org };
        });
        res.json({ success: true, ...result });
    } catch (err: any) {
        if (err?.message === "NOT_FOUND") return res.status(404).json({ error: "Request not found" });
        if (err?.message === "ALREADY_REVIEWED") return res.status(400).json({ error: "Request already reviewed" });
        if (err?.message === "NAME_TAKEN") return res.status(409).json({ error: "An organization with that name already exists" });
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

// Reject a club request with an optional reason.
app.post("/admin/club-requests/:id/reject", async (req, res) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    const requestId = parseInt(req.params.id);
    if (isNaN(requestId)) return res.status(400).json({ error: "Invalid request id" });
    const { reason } = req.body ?? {};
    try {
        const existing = await prisma.clubRequest.findUnique({ where: { id: requestId } });
        if (!existing) return res.status(404).json({ error: "Request not found" });
        if (existing.status !== "pending") return res.status(400).json({ error: "Request already reviewed" });

        const updated = await prisma.clubRequest.update({
            where: { id: requestId },
            data: {
                status: "rejected",
                rejectionReason: typeof reason === "string" && reason.trim() ? reason.trim() : null,
                reviewedAt: new Date(),
                reviewedById: admin.id,
            },
            include: {
                user: { select: { id: true, name: true, email: true } },
                reviewedBy: { select: { id: true, name: true, email: true } },
            },
        });
        res.json({ success: true, request: updated });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

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
                include: { organization: { select: { name: true, imageUrl: true } } },
                orderBy: { createdAt: "desc" },
            }),
            prisma.announcement.findMany({
                where: { organizationId: { in: orgIds } },
                include: { organization: { select: { name: true, imageUrl: true } } },
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