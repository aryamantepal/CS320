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
    const { email, password } = req.body;
    try {
        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) return res.status(400).json({ error: "Email already registered" });
        await prisma.user.create({ data: { email, password } });
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
            select: { id: true, email: true, name: true, createdAt: true },
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
