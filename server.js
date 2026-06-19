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

// Lightweight user listing for admins OR localhost callers (SSH/worker tooling).
// Returns NO email — only id, display name and counts — so it is safe to expose
// to local tooling without leaking PII. Admins keep the richer /api/admin/users.
app.get("/api/users", (req, res) => {
  const caller = getUserInfo(req);
  if (!caller.isAdmin && !isLocalRequest(req)) {
    return res.status(403).json({ error: "Admin or local access required" });
  }
  const users = listUsers().map(u => ({
    id: u.id,
    name: u.name,
    lastSeen: u.lastSeen,
    programCount: u.programCount,
    historyCount: u.historyCount,
    hasActiveWorkout: u.hasActiveWorkout
  }));
  res.json({ users, currentUserId: caller.id });
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
const GROQ_API_KEY = process.env.GROQ_API_KEY || "";
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

function isLocalRequest(req) {
  const a = req.socket?.remoteAddress || "";
  return a === "127.0.0.1" || a === "::1" || a === "::ffff:127.0.0.1";
}

app.get("/api/history/query", (req, res) => {
  try {
    const caller = getUserInfo(req);
    let targetUserId = caller.id;
    const requestedUserId = req.query.userId;
    if (requestedUserId && requestedUserId !== caller.id) {
      if (caller.isAdmin || isLocalRequest(req)) {
        targetUserId = String(requestedUserId);
      } else {
        return res.status(403).json({ error: "Forbidden: cannot query another user" });
      }
    }

    const data = readData(targetUserId);
    let entries = Array.isArray(data.history) ? data.history.slice() : [];
    const total = entries.length;

    const { name, setType, setIndex, since, until, exerciseId,
            sessionId, programId, setId } = req.query;

    // comma-OR helper: "a,b" -> ["a","b"]
    const orList = v => String(v).split(",").map(s => s.trim()).filter(Boolean);

    if (name) {
      const names = orList(name);
      entries = entries.filter(h => names.includes(h.exerciseName));
    }
    if (exerciseId) {
      const ids = orList(exerciseId);
      entries = entries.filter(h => ids.includes(String(h.exerciseId)));
    }
    if (sessionId) {
      const ids = orList(sessionId);
      entries = entries.filter(h => ids.includes(String(h.sessionId)));
    }
    if (programId) {
      const ids = orList(programId);
      entries = entries.filter(h => ids.includes(String(h.programId)));
    }
    if (setId) {
      const ids = orList(setId);
      entries = entries.filter(h => ids.includes(String(h.setId)));
    }
    if (setType) {
      const types = String(setType).split(",").map(s => s.trim()).filter(Boolean);
      entries = entries.filter(h => types.includes(h.setType || "force"));
    }
    if (setIndex != null && setIndex !== "") {
      const idx = Number(setIndex);
      if (!Number.isNaN(idx)) entries = entries.filter(h => h.setIndex === idx);
    }
    if (since) {
      const t = new Date(String(since)).getTime();
      if (!Number.isNaN(t)) entries = entries.filter(h => new Date(h.completedAt).getTime() >= t);
    }
    if (until) {
      const t = new Date(String(until)).getTime();
      if (!Number.isNaN(t)) entries = entries.filter(h => new Date(h.completedAt).getTime() <= t);
    }

    entries.sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());

    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 100, 1), 1000);

    // Optional aggregation. groupBy=exercise | session | sessionExercise
    // (default: no grouping, flat entries — preserves existing behaviour).
    const groupBy = req.query.groupBy ? String(req.query.groupBy) : null;
    if (groupBy && groupBy !== "none") {
      const keyFns = {
        exercise: h => h.exerciseName || h.exerciseId || "?",
        session: h => `${h.sessionId || "?"}|${(h.completedAt || "").slice(0, 10)}`,
        sessionExercise: h => `${h.sessionId || "?"}|${(h.completedAt || "").slice(0, 10)}|${h.exerciseName || "?"}`,
      };
      const keyFn = keyFns[groupBy];
      if (!keyFn) {
        return res.status(400).json({ error: `Invalid groupBy: ${groupBy}. Use exercise|session|sessionExercise.` });
      }
      const groups = new Map();
      for (const h of entries) {
        const k = keyFn(h);
        if (!groups.has(k)) {
          groups.set(k, {
            key: k,
            exerciseName: h.exerciseName ?? null,
            sessionId: h.sessionId ?? null,
            programId: h.programId ?? null,
            date: (h.completedAt || "").slice(0, 10) || null,
            sets: 0, totalReps: 0, maxWeight: 0, lastCompletedAt: null,
          });
        }
        const g = groups.get(k);
        g.sets += 1;
        g.totalReps += Number(h.reps) || 0;
        g.maxWeight = Math.max(g.maxWeight, Number(h.weight) || 0);
        if (!g.lastCompletedAt || h.completedAt > g.lastCompletedAt) g.lastCompletedAt = h.completedAt;
      }
      const grouped = [...groups.values()]
        .sort((a, b) => String(b.lastCompletedAt).localeCompare(String(a.lastCompletedAt)))
        .slice(0, limit);
      return res.json({
        userId: targetUserId,
        total,
        matched: entries.length,
        groupBy,
        groups: grouped.length,
        returned: grouped.length,
        results: grouped,
      });
    }

    const sliced = entries.slice(0, limit);

    res.json({
      userId: targetUserId,
      total,
      matched: entries.length,
      returned: sliced.length,
      entries: sliced,
    });
  } catch (error) {
    console.error("history/query error:", error);
    res.status(500).json({ error: "Failed to query history" });
  }
});


// ===== session-previous helpers (ported from frontend) =====
// session-previous.mjs
// Standalone port of the FitTracker "session as displayed in training, with
// previous last performance per set" logic. This mirrors the frontend
// (useWorkoutData.ts + TrainingSession.tsx) so the server can return exactly
// what the training UI shows — without the assistant reconstructing it.
//
// Exported: buildSessionPrevious(data, { programId, sessionId })
//   data = { programs, history, activeWorkout }
//
// Kept dependency-free and pure so it can be unit-tested offline AND pasted
// verbatim into server.js.

// ---- rotation resolution (ported from useWorkoutData.ts) ----

function getRotationGroupExercisesLegacy(program, groupId) {
  const out = [];
  for (const session of program.sessions || []) {
    for (const ex of session.exercises || []) {
      if (ex.rotationGroup === groupId) out.push(ex);
    }
  }
  return out;
}

function computeActiveRotationsLegacy(program, history) {
  const active = {};
  const groups = new Set();
  for (const s of program.sessions || [])
    for (const e of s.exercises || [])
      if (e.rotationGroup) groups.add(e.rotationGroup);

  for (const groupId of groups) {
    const exercises = getRotationGroupExercisesLegacy(program, groupId);
    if (exercises.length === 0) continue;
    const ids = new Set(exercises.map(e => e.id));
    const last = history
      .filter(h => h.programId === program.id && ids.has(h.exerciseId))
      .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))[0];
    if (last) {
      const li = exercises.findIndex(e => e.id === last.exerciseId);
      active[groupId] = exercises[(li + 1) % exercises.length].id;
    } else {
      active[groupId] = exercises[0].id;
    }
  }
  return active;
}

function computeActiveRotationsNew(program, history) {
  const active = {};
  if (!program.rotationGroups) return active;
  for (const group of program.rotationGroups) {
    if (!group.exercises || group.exercises.length === 0) continue;
    const ids = new Set(group.exercises.map(e => e.id));
    const names = new Map(group.exercises.map(e => [e.name, e.id]));
    const last = history
      .filter(h => h.programId === program.id &&
        (ids.has(h.exerciseId) || (h.exerciseName && names.has(h.exerciseName))))
      .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))[0];
    if (last) {
      let li = group.exercises.findIndex(e => e.id === last.exerciseId);
      if (li === -1 && last.exerciseName)
        li = group.exercises.findIndex(e => e.name === last.exerciseName);
      active[group.id] = group.exercises[(li + 1) % group.exercises.length].id;
    } else {
      active[group.id] = group.exercises[0].id;
    }
  }
  return active;
}

function computeActiveRotations(program, history) {
  return {
    ...computeActiveRotationsLegacy(program, history),
    ...computeActiveRotationsNew(program, history),
  };
}

// Resolve a new-style rotationGroupRef slot to its active exercise.
// Returns { exercise, rotationInfo } or null (group missing/empty).
function resolveRotationSlot(exercise, program, activeRotations) {
  if (!exercise.rotationGroupRef) return { exercise, rotationInfo: null };
  const group = (program.rotationGroups || []).find(g => g.id === exercise.rotationGroupRef);
  if (!group || !group.exercises || group.exercises.length === 0) return null;
  const activeId = activeRotations[group.id];
  const activeExercise = activeId
    ? group.exercises.find(e => e.id === activeId)
    : group.exercises[0];
  if (!activeExercise) return null;
  return {
    exercise: {
      ...exercise,
      name: activeExercise.name,
      sets: activeExercise.sets.map(s => ({ ...s })),
      mode: activeExercise.mode,
      notes: activeExercise.notes,
      _resolvedExerciseId: activeExercise.id,
    },
    rotationInfo: {
      kind: 'new',
      groupId: group.id,
      groupName: group.name || null,
      active: activeExercise.name,
      activeId: activeExercise.id,
      options: group.exercises.map(e => e.name),
    },
  };
}

// Legacy rotation visibility: a legacy rotationGroup slot is shown only if it is
// the active one. New rotationGroupRef slots are always shown (resolved).
function isExerciseActive(exercise, activeRotations) {
  if (exercise.rotationGroupRef) return true;
  if (!exercise.rotationGroup) return true;
  return activeRotations[exercise.rotationGroup] === exercise.id;
}

// ---- previous-performance lookup (ported verbatim from getLastPerformance) ----

function getLastPerformance(history, cutoffTime, exerciseId, setType, exerciseName, setIndex) {
  const filtered = cutoffTime != null
    ? history.filter(h => new Date(h.completedAt).getTime() < cutoffTime)
    : history;

  let candidates;
  if (exerciseName) {
    candidates = filtered.filter(h => h.exerciseName === exerciseName);
    if (candidates.length === 0)
      candidates = filtered.filter(h => !h.exerciseName && h.exerciseId === exerciseId);
  } else {
    candidates = filtered.filter(h => !h.exerciseName && h.exerciseId === exerciseId);
  }
  if (candidates.length === 0) return undefined;

  const sameType = setType
    ? candidates.filter(h => (h.setType || 'force') === setType)
    : candidates;
  const pool = sameType.length > 0 ? sameType : candidates;

  const sorted = [...pool].sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));
  if (setIndex == null) return sorted[0];

  const mostRecent = sorted[0];
  const mostRecentTime = new Date(mostRecent.completedAt).getTime();
  const sessionWindow = 4 * 60 * 60 * 1000;
  const lastSessionEntries = sorted.filter(h =>
    h.sessionId === mostRecent.sessionId &&
    mostRecentTime - new Date(h.completedAt).getTime() < sessionWindow);

  if (lastSessionEntries.some(h => h.setIndex != null)) {
    const match = lastSessionEntries.find(h => h.setIndex === setIndex);
    if (match) return match;
    const bySI = [...lastSessionEntries].sort((a, b) => (b.setIndex ?? 0) - (a.setIndex ?? 0));
    return bySI[0];
  }
  const chrono = [...lastSessionEntries].sort((a, b) =>
    new Date(a.completedAt) - new Date(b.completedAt));
  return chrono[setIndex - 1] ?? chrono[chrono.length - 1];
}

// ---- main builder ----

function resolveProgram(programs, programId) {
  if (!programId) return programs.length === 1 ? programs[0] : null;
  const byId = programs.find(p => p.id === programId);
  if (byId) return byId;
  const lc = String(programId).toLowerCase();
  return programs.find(p => (p.name || '').toLowerCase() === lc) || null;
}

function resolveSession(program, sessionId) {
  if (!sessionId) return null;
  const byId = (program.sessions || []).find(s => s.id === sessionId);
  if (byId) return byId;
  const lc = String(sessionId).toLowerCase();
  return (program.sessions || []).find(s => (s.name || '').toLowerCase() === lc) || null;
}

function buildSessionPrevious(data, { programId, sessionId }) {
  const programs = Array.isArray(data.programs) ? data.programs : [];
  const history = Array.isArray(data.history) ? data.history : [];
  const aw = data.activeWorkout || null;

  const program = resolveProgram(programs, programId);
  if (!program) return { error: 'program_not_found', status: 404 };
  const session = resolveSession(program, sessionId);
  if (!session) return { error: 'session_not_found', status: 404 };

  const isActiveWorkout = !!aw && aw.programId === program.id && aw.sessionId === session.id;
  const startedAt = isActiveWorkout ? (aw.startedAt || null) : null;
  const cutoffTime = startedAt ? new Date(startedAt).getTime() : null;

  // Rotations: snapshot from activeWorkout if this is the live session,
  // else compute fresh (what WOULD show if started now).
  const activeRotations = isActiveWorkout && aw.activeRotations
    ? aw.activeRotations
    : computeActiveRotations(program, history);

  // In-session transient edits (only when this is the live session).
  const exerciseOverrides = isActiveWorkout ? (aw.exerciseOverrides || {}) : {};
  const addedSets = isActiveWorkout ? (aw.addedSets || {}) : {};
  const addedExercises = isActiveWorkout ? (aw.addedExercises || []) : [];

  // "Last time this session was trained" — day of the most recent entry under
  // this sessionId (before cutoff). Used to flag fallbacks (exercise reached
  // back further than the last occurrence of this session).
  const sessionHist = history.filter(h =>
    h.sessionId === session.id && (cutoffTime == null || new Date(h.completedAt).getTime() < cutoffTime));
  const lastSessionDay = sessionHist.length
    ? sessionHist.map(h => (h.completedAt || '').slice(0, 10)).sort().slice(-1)[0]
    : null;

  const sessionWarnings = [];

  // Build displayed exercise list.
  const displayed = [];
  for (const slot of session.exercises || []) {
    if (!isExerciseActive(slot, activeRotations)) continue; // legacy rotation hidden
    const resolved = resolveRotationSlot(slot, program, activeRotations);
    if (!resolved) {
      sessionWarnings.push(`rotation slot ${slot.id} (${slot.name}) could not be resolved (group missing/empty)`);
      continue;
    }
    let ex = resolved.exercise;
    let rotationInfo = resolved.rotationInfo;
    // legacy rotation info (slot kept as-is, but note it's a rotation)
    if (!rotationInfo && slot.rotationGroup) {
      const opts = getRotationGroupExercisesLegacy(program, slot.rotationGroup);
      rotationInfo = {
        kind: 'legacy',
        groupId: slot.rotationGroup,
        groupName: slot.rotationGroup,
        active: ex.name,
        activeId: activeRotations[slot.rotationGroup] || null,
        options: opts.map(e => e.name),
      };
    }
    // overrides / added sets (live session only)
    const override = exerciseOverrides[ex.id];
    const extra = addedSets[ex.id] || [];
    const allSets = [...ex.sets, ...extra];
    const displayName = override ? override.name : ex.name;
    const historyId = override ? override.historyId : (ex._resolvedExerciseId || ex.id);
    displayed.push({ slot, ex, displayName, historyId, sets: allSets, rotationInfo, added: false });
  }
  for (const ex of addedExercises) {
    const extra = addedSets[ex.id] || [];
    displayed.push({
      slot: ex, ex, displayName: ex.name,
      historyId: ex._resolvedExerciseId || ex.id,
      sets: [...ex.sets, ...extra], rotationInfo: null, added: true,
    });
  }

  const exercises = displayed.map(d => {
    const { slot, displayName, historyId, sets, rotationInfo } = d;
    const mode = d.ex.mode || 'reps';
    const types = [...new Set(sets.map(s => s.type || 'force'))];
    const currentSetType = types[0] || 'force';
    const warnings = [];

    // slot drift: same slot id has carried >1 distinct exerciseName in history
    const slotNames = new Set(history.filter(h => h.exerciseId === slot.id && h.exerciseName).map(h => h.exerciseName));
    if (slotNames.size > 1)
      warnings.push(`slot ${slot.id} has carried multiple exercise names historically: ${[...slotNames].join(', ')}`);

    const targetSets = sets.map((s, i) => {
      const t = { setIndex: i + 1, setId: s.id, type: s.type || 'force', targetReps: s.targetReps ?? null, targetWeight: s.targetWeight ?? null };
      if (s.targetDuration != null) t.targetDuration = s.targetDuration;
      return t;
    });

    let chosenSource = null; // { date, sessionId }
    const previousSets = sets.map((s, i) => {
      const setIndex = i + 1;
      const prev = getLastPerformance(history, cutoffTime, historyId, s.type, displayName, setIndex);
      if (!prev) {
        return { setIndex, previous: null, fallback: false, crossSession: false, typeMismatch: false };
      }
      const prevDay = (prev.completedAt || '').slice(0, 10);
      if (!chosenSource || prevDay > chosenSource.date) chosenSource = { date: prevDay, sessionId: prev.sessionId };
      const fallback = lastSessionDay != null && prevDay < lastSessionDay;
      const crossSession = prev.sessionId !== session.id;
      const typeMismatch = (prev.setType || 'force') !== (s.type || 'force');
      return {
        setIndex,
        previous: {
          weight: prev.weight, reps: prev.reps, rpe: prev.rpe ?? null,
          duration: prev.duration ?? null, setType: prev.setType || null,
          completedAt: prev.completedAt, sessionId: prev.sessionId, setIndex: prev.setIndex ?? null,
        },
        fallback, crossSession, typeMismatch,
      };
    });

    if (previousSets.every(p => p.previous == null))
      warnings.push('no previous performance found (new exercise or never logged under this name)');
    if (previousSets.some(p => p.typeMismatch))
      warnings.push(`current setType (${currentSetType}) differs from the matched previous setType — historical tag, not current config`);
    if (previousSets.some(p => p.fallback))
      warnings.push('exercise was not performed in the last occurrence of this session — previous reached back to an earlier session');

    return {
      slotId: slot.id,
      exerciseId: historyId,
      displayName,
      currentExerciseName: displayName,
      mode,
      isRotation: !!rotationInfo,
      rotation: rotationInfo,
      added: d.added,
      currentSetType,
      targetSets,
      previousSets,
      previousSource: chosenSource,
      warnings,
    };
  });

  return {
    status: 200,
    body: {
      program: { id: program.id, name: program.name },
      session: { id: session.id, name: session.name, type: session.type ?? null },
      isActiveWorkout,
      startedAt,
      lastSessionDay,
      exercises,
      warnings: sessionWarnings,
    },
  };
}

// ==============================
// Session "previous values" endpoint
// ==============================
// Returns a program session exactly as the training UI renders it (rotation
// slots resolved, legacy rotations filtered, in-session overrides/added sets/
// added exercises applied when this is the live activeWorkout) together with,
// per set, the relevant *previous last performance*.
//
// Matching mirrors the frontend (useWorkoutData.ts getLastPerformance):
//   - previous is matched by exact exerciseName (the real exercise), NOT by the
//     fragile slot exerciseId. Legacy entries with no exerciseName fall back to
//     exerciseId only when there is no named history for that name.
//   - this is what keeps "Avant-bras" off the stale 91kg slot entries and pins
//     "Horizontal Pull Close Neutral Grip" to its 120x4 (26/05) instead of the
//     nameless 08/03 parasite or the Dumbbell/Diverging Row that reused the slot.
//
// Auth: a caller always reads their OWN session (cookie id). Reading another
// user (userId=) requires admin OR localhost, identical to /api/history/query.
app.get("/api/session/previous", (req, res) => {
  try {
    const caller = getUserInfo(req);
    let targetUserId = caller.id;
    const requestedUserId = req.query.userId;
    if (requestedUserId && requestedUserId !== caller.id) {
      if (caller.isAdmin || isLocalRequest(req)) {
        targetUserId = String(requestedUserId);
      } else {
        return res.status(403).json({ error: "Forbidden: cannot query another user" });
      }
    }

    const data = readData(targetUserId);
    const result = buildSessionPrevious(data, {
      programId: req.query.programId != null ? String(req.query.programId) : null,
      sessionId: req.query.sessionId != null ? String(req.query.sessionId) : null,
    });
    if (result.error) {
      return res.status(result.status || 400).json({ error: result.error });
    }
    res.json({ userId: targetUserId, generatedAt: new Date().toISOString(), ...result.body });
  } catch (error) {
    console.error("session/previous error:", error);
    res.status(500).json({ error: "Failed to build session previous" });
  }
});


app.use(express.static(join(__dirname, "dist")));

app.get("/{*splat}", (req, res) => {
  res.sendFile(join(__dirname, "dist", "index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log("Server running on port " + PORT);
});

