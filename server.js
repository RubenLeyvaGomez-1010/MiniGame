const express = require("express");
const fs = require("fs/promises");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, "data", "progress.json");

app.use(express.json());
app.use(express.static(__dirname));

function sanitizeUsername(input) {
    if (typeof input !== "string") {
        return "";
    }

    return input.trim().replace(/\s+/g, " ").slice(0, 24);
}

async function readProgressData() {
    try {
        const raw = await fs.readFile(DATA_FILE, "utf8");
        const parsed = JSON.parse(raw);
        if (!parsed.users || typeof parsed.users !== "object") {
            return { users: {} };
        }
        return parsed;
    } catch (error) {
        return { users: {} };
    }
}

async function writeProgressData(data) {
    await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
}

function defaultUserStats(username) {
    return {
        username,
        bestScore: 0,
        totalCorrect: 0,
        totalIncorrect: 0,
        highestStreak: 0,
        gamesPlayed: 0,
        medals: [],
        level: "Rookie",
        lastPlayed: null
    };
}

app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
});

app.get("/api/progress/:username", async (req, res) => {
    const username = sanitizeUsername(req.params.username);
    if (!username) {
        res.status(400).json({ error: "Nombre de usuario invalido" });
        return;
    }

    const data = await readProgressData();
    const user = data.users[username] || defaultUserStats(username);
    res.json(user);
});

app.post("/api/progress", async (req, res) => {
    const username = sanitizeUsername(req.body.username);
    if (!username) {
        res.status(400).json({ error: "Nombre de usuario invalido" });
        return;
    }

    const payload = req.body;
    const data = await readProgressData();
    const existing = data.users[username] || defaultUserStats(username);

    const bestScore = Math.max(Number(existing.bestScore) || 0, Number(payload.bestScore) || 0, Number(payload.score) || 0);
    const totalCorrect = Math.max(Number(existing.totalCorrect) || 0, Number(payload.totalCorrect) || 0, Number(payload.correct) || 0);
    const totalIncorrect = Math.max(Number(existing.totalIncorrect) || 0, Number(payload.totalIncorrect) || 0, Number(payload.incorrect) || 0);
    const highestStreak = Math.max(Number(existing.highestStreak) || 0, Number(payload.highestStreak) || 0, Number(payload.streak) || 0);
    const gamesPlayed = Math.max(Number(existing.gamesPlayed) || 0, Number(payload.gamesPlayed) || 0, 1);

    const medalsRaw = Array.isArray(payload.medals) ? payload.medals : existing.medals;
    const medals = [...new Set(medalsRaw)].slice(0, 20);

    const level = typeof payload.level === "string" && payload.level.trim() ? payload.level.trim().slice(0, 24) : existing.level;

    const updated = {
        username,
        bestScore,
        totalCorrect,
        totalIncorrect,
        highestStreak,
        gamesPlayed,
        medals,
        level,
        lastPlayed: new Date().toISOString()
    };

    data.users[username] = updated;
    await writeProgressData(data);

    res.json({ ok: true, progress: updated });
});

app.get("/api/leaderboard", async (req, res) => {
    const data = await readProgressData();
    const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 50);

    const items = Object.values(data.users)
        .sort((a, b) => (b.bestScore || 0) - (a.bestScore || 0))
        .slice(0, limit)
        .map((user, index) => ({
            rank: index + 1,
            username: user.username,
            bestScore: user.bestScore || 0,
            level: user.level || "Rookie",
            medals: Array.isArray(user.medals) ? user.medals.length : 0,
            lastPlayed: user.lastPlayed
        }));

    res.json({ items });
});

app.get("/", (_req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(PORT, () => {
    console.log(`Servidor iniciado en http://localhost:${PORT}`);
});
