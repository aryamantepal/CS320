import "dotenv/config";
import express from "express";
import cors from "cors";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client.ts";

// Prisma 7 requires a driver adapter — use the pooled URL at runtime
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const app = express();
app.use(cors());
app.use(express.json());

// REGISTER
app.post("/register", async (req, res) => {
    const { email, password } = req.body;

    try {
        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
            return res.status(400).json({ error: "Email already registered" });
        }

        await prisma.user.create({ data: { email, password } });
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

// LOGIN
app.post("/login", async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await prisma.user.findFirst({ where: { email, password } });

        if (!user) {
            return res.status(401).json({ error: "Invalid email or password" });
        }

        res.json({ success: true, user });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

app.listen(3000, "0.0.0.0", () => console.log("Server running on port 3000"));
