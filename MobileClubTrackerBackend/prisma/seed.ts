import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.ts";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    // Seed 2 orgs
    const chess = await prisma.organization.upsert({
        where: { name: "Chess Club" },
        update: {},
        create: {
            name: "Chess Club",
            description: "Competitive and casual chess for all skill levels.",
        },
    });

    const robotics = await prisma.organization.upsert({
        where: { name: "Robotics Club" },
        update: {},
        create: {
            name: "Robotics Club",
            description: "Build, program, and compete with robots.",
        },
    });

    // Seed events
    await prisma.event.createMany({
        skipDuplicates: true,
        data: [
            {
                title: "Spring Chess Tournament",
                startDateTime: new Date("2026-04-20T14:00:00Z"),
                location: "Student Union Room 204",
                organizationId: chess.id,
            },
            {
                title: "Weekly Blitz Night",
                startDateTime: new Date("2026-04-12T19:00:00Z"),
                location: "Campus Center 101",
                organizationId: chess.id,
            },
            {
                title: "Robot Sumo Competition",
                startDateTime: new Date("2026-04-25T10:00:00Z"),
                location: "Engineering Lab B",
                organizationId: robotics.id,
            },
            {
                title: "Intro to Arduino Workshop",
                startDateTime: new Date("2026-04-15T15:00:00Z"),
                location: "Maker Space",
                organizationId: robotics.id,
            },
        ],
    });

    // Seed announcements
    await prisma.announcement.createMany({
        skipDuplicates: true,
        data: [
            {
                title: "New meeting time",
                body: "Starting this week, Chess Club meets Tuesdays at 7pm instead of Wednesdays.",
                organizationId: chess.id,
            },
            {
                title: "Parts order arrived",
                body: "The new servo motors and sensor kits are in. Come pick yours up at the next meeting!",
                organizationId: robotics.id,
            },
        ],
    });

    // Seed a follow: first user in DB follows Chess Club
    const firstUser = await prisma.user.findFirst({ orderBy: { id: "asc" } });
    if (firstUser) {
        await prisma.follow.upsert({
            where: { userId_organizationId: { userId: firstUser.id, organizationId: chess.id } },
            update: {},
            create: { userId: firstUser.id, organizationId: chess.id },
        });
        console.log(`${firstUser.email} now follows Chess Club`);
    }

    console.log("Seed complete");
}

main()
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());
