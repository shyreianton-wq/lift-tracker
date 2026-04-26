import express from "express";
import cors from "cors";
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { createHash } from "crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 8080;
const DATA_DIR = join(__dirname, "user-data");
const USERS_FILE = join(DATA_DIR, "_users.json");

const ADMIN_EMAILS = [
  "shyreianton@gmail.com",
  "syllerby@gmail.com"
];

if (!existsSync(DATA_DIR)) {
  mkdirSync(DATA_DIR, { recursive: true });
}

// User registry (id -> { name, email, lastSeen })
function loadUsersRegistry() {
  if (!existsSync(USERS_FILE)) {
    return {};
  }
  return JSON.parse(readFileSync(USERS_FILE, "utf-8"));
}

function saveUsersRegistry(registry) {
  writeFileSync(USERS_FILE, JSON.stringify(registry, null, 2));
}

function registerUser(user) {
  const registry = loadUsersRegistry();
  registry[user.id] = {
    name: user.name,
    email: user.email,
    lastSeen: new Date().toISOString()
  };
  saveUsersRegistry(registry);
}

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "10mb" }));

function getUserInfo(req) {
  const cfAuth = req.headers.cookie?.split(";")
    .map(c => c.trim())
    .find(c => c.startsWith("CF_Authorization="));
  
  if (!cfAuth) {
    return { id: "default", email: null, name: "Invité", isAdmin: false };
  }
  
  try {
    const token = cfAuth.split("=")[1];
    const payload = token.split(".")[1];
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString());
    const email = decoded.email || decoded.sub || "unknown";
    const id = createHash("sha256").update(email).digest("hex").substring(0, 16);
    const namePart = email.split("@")[0];
    const name = namePart.charAt(0).toUpperCase() + namePart.slice(1).replace(/[._]/g, " ");
    const isAdmin = ADMIN_EMAILS.includes(email.toLowerCase());
    return { id, email, name, isAdmin };
  } catch (e) {
    console.error("Failed to parse CF_Authorization:", e.message);
    return { id: "default", email: null, name: "Invité", isAdmin: false };
  }
}

function getDataFile(userId) {
  return join(DATA_DIR, `data-${userId}.json`);
}

function initDataFile(userId) {
  const dataFile = getDataFile(userId);
  if (!existsSync(dataFile)) {
    const initialData = { programs: [], history: [], activeWorkout: null };
    writeFileSync(dataFile, JSON.stringify(initialData, null, 2));
  }
}

function readData(userId) {
  initDataFile(userId);
  const raw = readFileSync(getDataFile(userId), "utf-8");
  return JSON.parse(raw);
}

function writeData(userId, data) {
  writeFileSync(getDataFile(userId), JSON.stringify(data, null, 2));
}

function listUsers() {
  const files = readdirSync(DATA_DIR).filter(f => f.startsWith("data-") && f.endsWith(".json") && !f.startsWith("data-_"));
  const registry = loadUsersRegistry();
  
  return files.map(f => {
    const userId = f.replace("data-", "").replace(".json", "");
    const data = readData(userId);
    const userInfo = registry[userId] || {};
    return {
      id: userId,
      name: userInfo.name || null,
      email: userInfo.email || null,
      lastSeen: userInfo.lastSeen || null,
      programCount: data.programs?.length || 0,
      historyCount: data.history?.length || 0,
      hasActiveWorkout: !!data.activeWorkout
    };
  });
}

app.get("/api/user", (req, res) => {
  const user = getUserInfo(req);
  // Register user in registry
  if (user.id !== "default") {
    registerUser(user);
  }
  res.json({ name: user.name, email: user.email, isAdmin: user.isAdmin });
});

app.get("/api/whoami", (req, res) => {
  const user = getUserInfo(req);
  if (user.id !== "default") {
    registerUser(user);
  }
  res.json({ userId: user.id, name: user.name, isAdmin: user.isAdmin, file: `data-${user.id}.json` });
});

app.get("/api/admin/users", (req, res) => {
  const user = getUserInfo(req);
  if (!user.isAdmin) {
    return res.status(403).json({ error: "Admin access required" });
  }
  const users = listUsers();
  res.json({ users, currentUserId: user.id });
});

app.get("/api/admin/users/:userId/data", (req, res) => {
  const user = getUserInfo(req);
  if (!user.isAdmin) {
    return res.status(403).json({ error: "Admin access required" });
  }
  try {
    const data = readData(req.params.userId);
    res.json(data);
  } catch (error) {
    res.status(404).json({ error: "User not found" });
  }
});

app.post("/api/admin/users/:userId/data", (req, res) => {
  const user = getUserInfo(req);
  if (!user.isAdmin) {
    return res.status(403).json({ error: "Admin access required" });
  }
  try {
    const { programs, history, activeWorkout } = req.body;
    writeData(req.params.userId, { programs, history, activeWorkout });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to save data" });
  }
});

app.post("/api/admin/share-program", (req, res) => {
  const user = getUserInfo(req);
  if (!user.isAdmin) {
    return res.status(403).json({ error: "Admin access required" });
  }
  try {
    const { programId, fromUserId, toUserId } = req.body;
    const fromData = readData(fromUserId);
    const toData = readData(toUserId);
    
    const program = fromData.programs.find(p => p.id === programId);
    if (!program) {
      return res.status(404).json({ error: "Program not found" });
    }
    
    const newProgram = {
      ...program,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: program.name + " (copie)",
      createdAt: new Date().toISOString()
    };
    
    toData.programs.push(newProgram);
    writeData(toUserId, toData);
    
    res.json({ success: true, newProgramId: newProgram.id });
  } catch (error) {
    res.status(500).json({ error: "Failed to share program" });
  }
});

app.get("/api/data", (req, res) => {
  try {
    const user = getUserInfo(req);
    if (user.id !== "default") {
      registerUser(user);
    }
    const data = readData(user.id);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: "Failed to read data" });
  }
});

app.post("/api/data", (req, res) => {
  try {
    const user = getUserInfo(req);
    const { programs, history, activeWorkout } = req.body;
    console.log(`[user:${user.id}] SAVE: programs=${programs?.length}, history=${history?.length}`);
    writeData(user.id, { programs, history, activeWorkout });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to save data" });
  }
});

app.patch("/api/data", (req, res) => {
  try {
    const user = getUserInfo(req);
    const current = readData(user.id);
    const updated = { ...current, ...req.body };
    writeData(user.id, updated);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to update data" });
  }
});


// ==============================
// AI Coach endpoint
// ==============================
const GROQ_API_KEY = "process.env.GROQ_API_KEY-REMOVED";
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.3-70b-versatile";

// Simple in-memory rate limiter: userId -> [timestamps]
const aiRateLimits = new Map();
function checkRateLimit(userId) {
  const now = Date.now();
  const window = 60_000; // 1 minute
  const max = 10;
  const times = (aiRateLimits.get(userId) || []).filter(t => now - t < window);
  if (times.length >= max) return false;
  times.push(now);
  aiRateLimits.set(userId, times);
  return true;
}

const AI_SYSTEM_PROMPT = `Tu es un coach de musculation expert et bienveillant. Tu analyses les séances d'entraînement et donnes des conseils personnalisés en français.

Règles :
- Sois concis et actionnable (pas de blabla)
- Utilise les données fournies pour personnaliser tes conseils
- Félicite les progrès, identifie les points d'amélioration
- Suggère des poids/reps concrets pour la prochaine séance
- Si tu détectes un déséquilibre (ex: trop de push pas assez de pull), signale-le
- Utilise des emojis avec modération
- Formate en markdown (gras, listes)`;

app.post("/api/ai/chat", async (req, res) => {
  const user = getUserInfo(req);

  if (!checkRateLimit(user.id)) {
    return res.status(429).json({ error: "Trop de requêtes. Attends une minute avant de réessayer." });
  }

  const { messages, context } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "messages requis" });
  }

  // Build system message, optionally injecting user context
  let systemContent = AI_SYSTEM_PROMPT;
  if (context) {
    if (context.history && context.history.length > 0) {
      systemContent += `\n\n## Données de l'utilisateur\n`;
      systemContent += `**Dernières séances (${context.history.length} sets enregistrés)**\n`;
      const recent = context.history.slice(-50);
      const byDate = {};
      for (const h of recent) {
        const date = h.completedAt ? h.completedAt.split("T")[0] : "?";
        if (!byDate[date]) byDate[date] = [];
        byDate[date].push(h);
      }
      const dateEntries = Object.entries(byDate).slice(-7);
      for (const [date, sets] of dateEntries) {
        systemContent += `- ${date}: ${sets.length} sets\n`;
      }
    }
    if (context.programs && context.programs.length > 0) {
      systemContent += `\n**Programmes actifs:** ${context.programs.map(p => p.name).join(", ")}\n`;
    }
    if (context.prs && Object.keys(context.prs).length > 0) {
      systemContent += `\n**Records personnels:**\n`;
      const prEntries = Object.entries(context.prs).slice(0, 10);
      for (const [ex, pr] of prEntries) {
        systemContent += `- ${ex}: ${pr}\n`;
      }
    }
  }

  const groqMessages = [
    { role: "system", content: systemContent },
    ...messages
  ];

  try {
    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: groqMessages,
        max_tokens: 1024,
        temperature: 0.7,
        stream: true
      })
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("Groq error:", err);
      return res.status(502).json({ error: "Erreur API Groq", details: err });
    }

    // Stream SSE back to client
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop();
      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6).trim();
          if (data === "[DONE]") {
            res.write("data: [DONE]\n\n");
          } else {
            res.write(`${line}\n\n`);
          }
        }
      }
    }
    res.end();
  } catch (e) {
    console.error("AI chat error:", e);
    if (!res.headersSent) {
      res.status(500).json({ error: "Erreur interne" });
    }
  }
});
app.use(express.static(join(__dirname, "dist")));

app.get("/{*splat}", (req, res) => {
  res.sendFile(join(__dirname, "dist", "index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log("Server running on port " + PORT);
});

