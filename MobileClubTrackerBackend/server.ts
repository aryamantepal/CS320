import "dotenv/config";
import express from "express";
import cors from "cors";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client.ts";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const app = express();
app.use(cors());
app.use(express.json());

// ── CONSTANTS ─────────────────────────────────────────────────────────────────

const BCRYPT_ROUNDS = 10;
const MIN_PASSWORD_LENGTH = 6;

// ── SMALL HELPERS ─────────────────────────────────────────────────────────────

// `req.params.X` is typed as `string | string[]` under @types/express 5.
// Every numeric route param goes through this helper so we don't sprinkle
// `parseInt(String(...))` everywhere.
const intParam = (v: unknown) => parseInt(String(v ?? ""));

// Generates a fresh opaque session token. Stored as User.token and sent back
// to the client as `Authorization: Bearer <token>` on every authenticated call.
function generateToken() {
    return randomBytes(32).toString("hex");
}

// Always normalize emails the same way at the boundary (register, login, lookup).
// Avoids the case where "Alice@x.com" registers but later "alice@x.com" can't log in.
function normalizeEmail(email: unknown) {
    if (typeof email !== "string") return "";
    return email.trim().toLowerCase();
}

// Assigns a consistent color to each event/announcement card.
function randomRgb() {
    const r = Math.floor(Math.random() * 120) + 80;  // range: 80-200
    const g = Math.floor(Math.random() * 120) + 80;
    const b = Math.floor(Math.random() * 120) + 80;
    return {
        base: `rgb(${r},${g},${b})`,
        light: `rgb(${Math.round(r+(255-r)*0.4)},${Math.round(g+(255-g)*0.4)},${Math.round(b+(255-b)*0.4)})`,
    };
}

// Fan out a push notification to every follower of an org. Fire-and-forget: we
// never await the response in the request handler so a slow Expo push server
// does not delay the API response.
function sendPushToFollowers(orgId: number, payloadFor: (token: string) => object) {
    (async () => {
        try {
            const followers = await prisma.follow.findMany({
                where: { organizationId: orgId },
                include: { user: { select: { pushToken: true } } },
            });
            const tokens = followers
                .map((f) => f.user.pushToken)
                .filter((t): t is string => !!t);
            if (tokens.length === 0) return;
            await fetch("https://exp.host/--/api/v2/push/send", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(tokens.map(payloadFor)),
            });
        } catch (err) {
            console.error("push fan-out failed:", err);
        }
    })();
}

// Shape a User row for the wire — never leak password/token back to clients.
type UserRow = {
    id: number;
    email: string;
    name: string | null;
    role: string;
    imageUrl: string | null;
    createdAt: Date;
    managedOrgs: { organization: { id: number; name: string; description: string | null; imageUrl: string | null } }[];
};
function shapeUser(row: UserRow) {
    return {
        id: row.id,
        email: row.email,
        name: row.name,
        role: row.role,
        imageUrl: row.imageUrl,
        createdAt: row.createdAt,
        managedOrgs: row.managedOrgs
            .map((m) => m.organization)
            .sort((a, b) => a.name.localeCompare(b.name)),
    };
}

const userSelect = {
    id: true,
    email: true,
    name: true,
    role: true,
    imageUrl: true,
    createdAt: true,
    managedOrgs: {
        select: {
            organization: { select: { id: true, name: true, description: true, imageUrl: true } },
        },
    },
} as const;

// ── AUTH MIDDLEWARE ───────────────────────────────────────────────────────────
// All mutating/private routes go through requireAuth. Role-aware helpers below
// (requireAdmin, requireManagerOf) layer on top of the resolved req.user.

declare global {
    namespace Express {
        interface Request {
            user?: { id: number; email: string; role: string; name: string | null };
        }
    }
}

function extractToken(req: express.Request): string | null {
    const raw = req.header("authorization") ?? req.header("Authorization");
    if (!raw) return null;
    const m = raw.match(/^Bearer\s+(.+)$/i);
    return m ? m[1].trim() : null;
}

async function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
    const token = extractToken(req);
    if (!token) return res.status(401).json({ error: "Missing auth token" });
    const user = await prisma.user.findUnique({
        where: { token },
        select: { id: true, email: true, role: true, name: true },
    });
    if (!user) return res.status(401).json({ error: "Invalid auth token" });
    req.user = user;
    next();
}

function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
    if (req.user?.role !== "admin") {
        return res.status(403).json({ error: "Admin role required" });
    }
    next();
}

// Ensures the caller manages the org in :orgId. Admins always pass.
async function requireManagerOfParam(req: express.Request, res: express.Response, next: express.NextFunction) {
    const orgId = intParam(req.params.orgId);
    if (isNaN(orgId)) return res.status(400).json({ error: "Invalid org id" });
    if (req.user?.role === "admin") return next();
    const row = await prisma.orgManager.findUnique({
        where: { userId_organizationId: { userId: req.user!.id, organizationId: orgId } },
    });
    if (!row) return res.status(403).json({ error: "Not a manager of this club" });
    next();
}

// Ensures the caller manages the org that owns :eventId / :announcementId.
async function requireManagerOfEvent(req: express.Request, res: express.Response, next: express.NextFunction) {
    const eventId = intParam(req.params.eventId);
    if (isNaN(eventId)) return res.status(400).json({ error: "Invalid event id" });
    const event = await prisma.event.findUnique({ where: { id: eventId }, select: { organizationId: true } });
    if (!event) return res.status(404).json({ error: "Event not found" });
    if (req.user?.role === "admin") return next();
    const row = await prisma.orgManager.findUnique({
        where: { userId_organizationId: { userId: req.user!.id, organizationId: event.organizationId } },
    });
    if (!row) return res.status(403).json({ error: "Not a manager of this club" });
    next();
}

async function requireManagerOfAnnouncement(req: express.Request, res: express.Response, next: express.NextFunction) {
    const announcementId = intParam(req.params.announcementId);
    if (isNaN(announcementId)) return res.status(400).json({ error: "Invalid announcement id" });
    const ann = await prisma.announcement.findUnique({ where: { id: announcementId }, select: { organizationId: true } });
    if (!ann) return res.status(404).json({ error: "Announcement not found" });
    if (req.user?.role === "admin") return next();
    const row = await prisma.orgManager.findUnique({
        where: { userId_organizationId: { userId: req.user!.id, organizationId: ann.organizationId } },
    });
    if (!row) return res.status(403).json({ error: "Not a manager of this club" });
    next();
}

// Caller must be acting on their own user record (or be an admin).
function requireSelfOrAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
    const userId = intParam(req.params.userId);
    if (isNaN(userId)) return res.status(400).json({ error: "Invalid user id" });
    if (req.user?.role === "admin") return next();
    if (req.user?.id !== userId) return res.status(403).json({ error: "Forbidden" });
    next();
}

// ── PUBLIC AUTH ENDPOINTS ─────────────────────────────────────────────────────

app.post("/register", async (req, res) => {
    const email = normalizeEmail(req.body?.email);
    const password = typeof req.body?.password === "string" ? req.body.password : "";
    const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";

    if (!email) return res.status(400).json({ error: "Email is required" });
    if (password.length < MIN_PASSWORD_LENGTH) {
        return res.status(400).json({ error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` });
    }
    try {
        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) return res.status(400).json({ error: "Email already registered" });
        const hashed = await bcrypt.hash(password, BCRYPT_ROUNDS);
        await prisma.user.create({
            data: { email, password: hashed, ...(name && { name }) },
        });
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

app.post("/login", async (req, res) => {
    const email = normalizeEmail(req.body?.email);
    const password = typeof req.body?.password === "string" ? req.body.password : "";
    if (!email || !password) return res.status(400).json({ error: "Email and password are required" });
    try {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return res.status(401).json({ error: "Invalid email or password" });

        // Verify password — supports a one-time lazy upgrade for legacy
        // plaintext rows (any password not starting with "$2" is treated as
        // legacy and re-hashed in place after a successful match).
        const looksHashed = user.password.startsWith("$2");
        let valid = false;
        if (looksHashed) {
            valid = await bcrypt.compare(password, user.password);
        } else {
            valid = user.password === password;
            if (valid) {
                const hashed = await bcrypt.hash(password, BCRYPT_ROUNDS);
                await prisma.user.update({ where: { id: user.id }, data: { password: hashed } });
            }
        }
        if (!valid) return res.status(401).json({ error: "Invalid email or password" });

        // Rotate token on every login so a stolen old token becomes useless once
        // the rightful owner signs in again.
        const token = generateToken();
        const fresh = await prisma.user.update({
            where: { id: user.id },
            data: { token },
            select: userSelect,
        });
        res.json({ success: true, token, user: shapeUser(fresh) });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

app.post("/logout", requireAuth, async (req, res) => {
    try {
        await prisma.user.update({ where: { id: req.user!.id }, data: { token: null } });
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

// Returns the *current* user, including managedOrgs. Clients call this on app
// focus to refresh stale cached data (role promoted to manager, new org added,
// etc.) without forcing a logout/login.
app.get("/me", requireAuth, async (req, res) => {
    try {
        const fresh = await prisma.user.findUnique({
            where: { id: req.user!.id },
            select: userSelect,
        });
        if (!fresh) return res.status(404).json({ error: "User not found" });
        res.json({ user: shapeUser(fresh) });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

// ── ORGS ──────────────────────────────────────────────────────────────────────

app.get("/orgs", requireAuth, async (_req, res) => {
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

app.get("/orgs/:orgId", requireAuth, async (req, res) => {
    const orgId = intParam(req.params.orgId);
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

app.get("/orgs/:orgId/posts", requireAuth, async (req, res) => {
    const orgId = intParam(req.params.orgId);
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

// Manager creates an event for their org. Push fan-out is fire-and-forget so
// the API response returns as soon as the row is committed.
app.post("/orgs/:orgId/events", requireAuth, requireManagerOfParam, async (req, res) => {
    const orgId = intParam(req.params.orgId);
    const { title, location, startDateTime } = req.body ?? {};
    if (typeof title !== "string" || !title.trim()) return res.status(400).json({ error: "Title is required" });
    if (typeof location !== "string" || !location.trim()) return res.status(400).json({ error: "Location is required" });
    if (!startDateTime) return res.status(400).json({ error: "startDateTime is required" });
    const date = new Date(startDateTime);
    if (isNaN(date.getTime())) return res.status(400).json({ error: "Invalid startDateTime" });

    try {
        const { base } = randomRgb();
        const event = await prisma.event.create({
            data: {
                title: title.trim(),
                location: location.trim(),
                startDateTime: date,
                organizationId: orgId,
                color: base,
            },
        });

        const org = await prisma.organization.findUnique({ where: { id: orgId } });
        sendPushToFollowers(orgId, (token) => ({
            to: token,
            title: `📅 New event from ${org?.name}`,
            body: `${event.title} · 📍 ${event.location}`,
            sound: "default",
        }));

        res.json(event);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

app.post("/orgs/:orgId/announcements", requireAuth, requireManagerOfParam, async (req, res) => {
    const orgId = intParam(req.params.orgId);
    const { title, body } = req.body ?? {};
    if (typeof title !== "string" || !title.trim()) return res.status(400).json({ error: "Title is required" });
    if (typeof body !== "string" || !body.trim()) return res.status(400).json({ error: "Body is required" });

    try {
        const { light } = randomRgb();
        const announcement = await prisma.announcement.create({
            data: {
                title: title.trim(),
                body: body.trim(),
                organizationId: orgId,
                color: light,
            },
        });

        const org = await prisma.organization.findUnique({ where: { id: orgId } });
        sendPushToFollowers(orgId, (token) => ({
            to: token,
            title: `📢 New announcement from ${org?.name}`,
            body: `${announcement.title} · 📝 ${announcement.body}`,
            sound: "default",
        }));

        res.json(announcement);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

app.delete("/events/:eventId", requireAuth, requireManagerOfEvent, async (req, res) => {
    const eventId = intParam(req.params.eventId);
    try {
        await prisma.event.delete({ where: { id: eventId } });
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

app.delete("/announcements/:announcementId", requireAuth, requireManagerOfAnnouncement, async (req, res) => {
    const announcementId = intParam(req.params.announcementId);
    try {
        await prisma.announcement.delete({ where: { id: announcementId } });
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

app.patch("/orgs/:orgId", requireAuth, requireManagerOfParam, async (req, res) => {
    const orgId = intParam(req.params.orgId);
    const { description, name, imageUrl } = req.body ?? {};
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

// ── ORG MANAGERS (many-to-many) ───────────────────────────────────────────────

app.get("/orgs/:orgId/managers", requireAuth, async (req, res) => {
    const orgId = intParam(req.params.orgId);
    if (isNaN(orgId)) return res.status(400).json({ error: "Invalid org id" });
    try {
        const rows = await prisma.orgManager.findMany({
            where: { organizationId: orgId },
            select: {
                createdAt: true,
                user: { select: { id: true, name: true, email: true, imageUrl: true } },
            },
            orderBy: { createdAt: "asc" },
        });
        res.json(rows.map((r) => ({ ...r.user, addedAt: r.createdAt })));
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

// Add a manager by email. Caller must already manage this org (verified by the
// requireManagerOfParam middleware). Bumps the new manager's role to "manager"
// if they were a regular user. Admins keep their admin role.
app.post("/orgs/:orgId/managers", requireAuth, requireManagerOfParam, async (req, res) => {
    const orgId = intParam(req.params.orgId);
    const email = normalizeEmail(req.body?.email);
    if (!email) return res.status(400).json({ error: "Email is required" });
    try {
        const newManager = await prisma.user.findUnique({ where: { email } });
        if (!newManager) return res.status(404).json({ error: "No user with that email" });

        const existing = await prisma.orgManager.findUnique({
            where: { userId_organizationId: { userId: newManager.id, organizationId: orgId } },
        });
        if (existing) return res.status(409).json({ error: "User is already a manager of this club" });

        await prisma.$transaction(async (tx) => {
            await tx.orgManager.create({
                data: { userId: newManager.id, organizationId: orgId },
            });
            if (newManager.role === "user") {
                await tx.user.update({
                    where: { id: newManager.id },
                    data: { role: "manager" },
                });
            }
        });

        res.json({
            success: true,
            manager: {
                id: newManager.id,
                name: newManager.name,
                email: newManager.email,
                imageUrl: newManager.imageUrl,
            },
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

// ── USER PROFILE ──────────────────────────────────────────────────────────────

app.patch("/users/:userId", requireAuth, requireSelfOrAdmin, async (req, res) => {
    const userId = intParam(req.params.userId);
    const { imageUrl, name } = req.body ?? {};
    try {
        const fresh = await prisma.user.update({
            where: { id: userId },
            data: {
                ...(name !== undefined && { name }),
                ...(imageUrl !== undefined && { imageUrl }),
            },
            select: userSelect,
        });
        res.json({ success: true, user: shapeUser(fresh) });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

app.patch("/users/:userId/password", requireAuth, requireSelfOrAdmin, async (req, res) => {
    const userId = intParam(req.params.userId);
    const { currentPassword, newPassword } = req.body ?? {};
    if (typeof currentPassword !== "string" || typeof newPassword !== "string") {
        return res.status(400).json({ error: "Both current and new password are required" });
    }
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
        return res.status(400).json({ error: `New password must be at least ${MIN_PASSWORD_LENGTH} characters` });
    }
    try {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) return res.status(404).json({ error: "User not found" });

        // Same legacy plaintext fallback as /login. Once the row is hashed it
        // will never re-enter the legacy branch.
        const looksHashed = user.password.startsWith("$2");
        const ok = looksHashed
            ? await bcrypt.compare(currentPassword, user.password)
            : user.password === currentPassword;
        if (!ok) return res.status(401).json({ error: "Current password is incorrect" });

        const hashed = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
        // Rotate token too — a password change should invalidate other sessions.
        const newToken = generateToken();
        await prisma.user.update({
            where: { id: userId },
            data: { password: hashed, token: newToken },
        });
        res.json({ success: true, token: newToken });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

app.patch("/users/:userId/push-token", requireAuth, requireSelfOrAdmin, async (req, res) => {
    const userId = intParam(req.params.userId);
    const pushToken = req.body?.pushToken;
    try {
        await prisma.user.update({
            where: { id: userId },
            data: { pushToken: pushToken ?? null },
        });
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

// Convenience: explicit clear (used by the in-app "Notifications: Off" toggle).
app.delete("/users/:userId/push-token", requireAuth, requireSelfOrAdmin, async (req, res) => {
    const userId = intParam(req.params.userId);
    try {
        await prisma.user.update({ where: { id: userId }, data: { pushToken: null } });
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

// ── CLUB REQUESTS ─────────────────────────────────────────────────────────────

// User submits a request to start a new club. The userId is taken from the
// authenticated session — never from the body — so users can only submit
// requests on their own behalf.
app.post("/club-requests", requireAuth, async (req, res) => {
    const { clubName, description, location } = req.body ?? {};
    if (typeof clubName !== "string" || !clubName.trim()) return res.status(400).json({ error: "Club name is required" });
    if (typeof description !== "string" || !description.trim()) return res.status(400).json({ error: "Description is required" });
    if (typeof location !== "string" || !location.trim()) return res.status(400).json({ error: "Location is required" });

    try {
        const existing = await prisma.clubRequest.findFirst({
            where: { userId: req.user!.id, status: "pending" },
        });
        if (existing) return res.status(400).json({ error: "You already have a pending request" });

        const request = await prisma.clubRequest.create({
            data: {
                userId: req.user!.id,
                clubName: clubName.trim(),
                description: description.trim(),
                location: location.trim(),
            },
        });
        res.json(request);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

// ── ADMIN ROUTES ──────────────────────────────────────────────────────────────
// Admins are assigned manually in the DB (UPDATE "User" SET role = 'admin' …).

app.get("/admin/club-requests", requireAuth, requireAdmin, async (req, res) => {
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

app.post("/admin/club-requests/:id/approve", requireAuth, requireAdmin, async (req, res) => {
    const requestId = intParam(req.params.id);
    if (isNaN(requestId)) return res.status(400).json({ error: "Invalid request id" });
    try {
        const result = await prisma.$transaction(async (tx) => {
            const request = await tx.clubRequest.findUnique({ where: { id: requestId } });
            if (!request) throw new Error("NOT_FOUND");
            if (request.status !== "pending") throw new Error("ALREADY_REVIEWED");

            const nameClash = await tx.organization.findUnique({ where: { name: request.clubName } });
            if (nameClash) throw new Error("NAME_TAKEN");

            const org = await tx.organization.create({
                data: { name: request.clubName, description: request.description },
            });
            await tx.orgManager.create({
                data: { userId: request.userId, organizationId: org.id },
            });

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
                    reviewedById: req.user!.id,
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

app.post("/admin/club-requests/:id/reject", requireAuth, requireAdmin, async (req, res) => {
    const requestId = intParam(req.params.id);
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
                reviewedById: req.user!.id,
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
// All follow routes operate on the authenticated user — no userId param on the
// wire. Prevents one user from following/unfollowing on behalf of another.

app.get("/follows", requireAuth, async (req, res) => {
    try {
        const follows = await prisma.follow.findMany({ where: { userId: req.user!.id } });
        res.json(follows.map((f) => f.organizationId));
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

app.get("/follows/orgs", requireAuth, async (req, res) => {
    try {
        const follows = await prisma.follow.findMany({ where: { userId: req.user!.id } });
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

app.post("/follow", requireAuth, async (req, res) => {
    const organizationId = intParam(req.body?.organizationId);
    if (isNaN(organizationId)) return res.status(400).json({ error: "Invalid organizationId" });
    try {
        await prisma.follow.create({
            data: { userId: req.user!.id, organizationId },
        });
        res.json({ success: true });
    } catch (err: any) {
        if (err.code === "P2002") return res.status(400).json({ error: "Already following" });
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

app.delete("/follow", requireAuth, async (req, res) => {
    const organizationId = intParam(req.body?.organizationId);
    if (isNaN(organizationId)) return res.status(400).json({ error: "Invalid organizationId" });
    try {
        await prisma.follow.delete({
            where: { userId_organizationId: { userId: req.user!.id, organizationId } },
        });
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

// ── FEED ──────────────────────────────────────────────────────────────────────

app.get("/feed", requireAuth, async (req, res) => {
    try {
        const follows = await prisma.follow.findMany({ where: { userId: req.user!.id } });
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
