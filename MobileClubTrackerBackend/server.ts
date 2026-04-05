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
        const user = await prisma.user.findFirst({ where: { email, password } });
        if (!user) return res.status(401).json({ error: "Invalid email or password" });
        res.json({ success: true, user });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

// ── ORGS ──────────────────────────────────────────────────────────────────────

// List all orgs
app.get("/orgs", async (_req, res) => {
    try {
        const orgs = await prisma.organization.findMany({ orderBy: { name: "asc" } });
        res.json(orgs);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

// ── FOLLOWS ───────────────────────────────────────────────────────────────────

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

// Get feed for a user: events + announcements from followed orgs, sorted newest first
app.get("/feed/:userId", async (req, res) => {
    const userId = parseInt(req.params.userId);
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

        // Merge into a unified feed with a type tag, sorted newest first
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
