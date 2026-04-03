const express = require("express");
const { Pool } = require("pg");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// Connect to your PostgreSQL database
const pool = new Pool({
    user: "postgres",       // your postgres username (default is postgres)
    host: "localhost",
    database: "mobileclubtrackerdb",    // you'll create this in Step 2.
    password: "mirziya2006",   // your postgres password
    port: 5432,
});

/* STEP2: Create the database and users table
1. sudo -u postgress psql ---> default user is called "postgres"
2. CREATE DATABASE mobileclubtrackerdb;
3. \c mobileclubtrackerdb
4. CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);
5. To see all current users: SELECT * FROM users;

NOTE: sudo systemctl start postgresql ---> Starts the PostgreSQL server if it's not running
*/

// REGISTER
app.post("/register", async (req, res) => {
    const { email, password } = req.body;

    try {
        // Check if user already exists
        const existing = await pool.query(
            "SELECT * FROM users WHERE email = $1",
            [email]
        );
        if (existing.rows.length > 0) {
            return res.status(400).json({ error: "Email already registered" });
        }

        // Insert new user (plain text password for now)
        await pool.query(
            "INSERT INTO users (email, password) VALUES ($1, $2)",
            [email, password]
        );

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
        const result = await pool.query(
            "SELECT * FROM users WHERE email = $1 AND password = $2",
            [email, password]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: "Invalid email or password" });
        }

        res.json({ success: true, user: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

app.listen(3000, "0.0.0.0", () => console.log("Server running on port 3000"));