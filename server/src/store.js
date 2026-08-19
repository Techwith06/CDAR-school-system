import { createClient } from "@vercel/kv";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const TABLES = [
  "departments",
  "programs",
  "courses",
  "users",
  "materials",
  "notifications",
  "assignments",
  "enrollments",
];

const PREFIX = "cdar:";

const useKV = Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);

let kv;
if (useKV) {
  kv = createClient({
    url: process.env.KV_REST_API_URL,
    token: process.env.KV_REST_API_TOKEN,
  });
}

// ---- Local JSON-file store (dev only, no Vercel KV configured) ----

const DATA_DIR = path.join(__dirname, "..", "data");
const DB_FILE = path.join(DATA_DIR, "db.json");

function emptyDb() {
  const db = { seq: {} };
  for (const t of TABLES) db[t] = [];
  return db;
}

function readLocalDb() {
  if (!fs.existsSync(DB_FILE)) return emptyDb();
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
  } catch {
    return emptyDb();
  }
}

function writeLocalDb(db) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf-8");
}

// ---- KV helpers ----

async function kvGetTable(name) {
  const rows = await kv.get(`${PREFIX}${name}`);
  return Array.isArray(rows) ? rows : [];
}

async function kvSetTable(name, rows) {
  await kv.set(`${PREFIX}${name}`, rows);
}

async function kvNextSeq(name) {
  return kv.incr(`${PREFIX}seq:${name}`);
}

// ---- Public store API ----

let mutex = Promise.resolve();

function withLock(fn) {
  const run = mutex.then(fn);
  mutex = run.catch(() => {});
  return run;
}

export async function getTable(name) {
  if (useKV) return kvGetTable(name);
  return readLocalDb()[name] ?? [];
}

export async function saveTable(name, rows) {
  if (useKV) return kvSetTable(name, rows);
  const db = readLocalDb();
  db[name] = rows;
  writeLocalDb(db);
}

export async function nextId(table) {
  if (useKV) {
    const seq = await kvNextSeq(table);
    return Number(seq);
  }
  const db = readLocalDb();
  const seq = (db.seq[table] ?? 0) + 1;
  db.seq[table] = seq;
  writeLocalDb(db);
  return seq;
}

export async function insert(table, row) {
  return withLock(async () => {
    const rows = await getTable(table);
    const id = row.id ?? (await nextId(table));
    if (rows.some((r) => r.id === id)) {
      throw new Error(`Duplicate id ${id} in ${table}`);
    }
    const record = { ...row, id };
    rows.push(record);
    await saveTable(table, rows);
    return record;
  });
}

export async function update(table, id, patch) {
  return withLock(async () => {
    const rows = await getTable(table);
    const idx = rows.findIndex((r) => r.id === id);
    if (idx === -1) return null;
    rows[idx] = { ...rows[idx], ...patch, id };
    await saveTable(table, rows);
    return rows[idx];
  });
}

export async function remove(table, id) {
  return withLock(async () => {
    const rows = await getTable(table);
    const next = rows.filter((r) => r.id !== id);
    if (next.length === rows.length) return false;
    await saveTable(table, next);
    return true;
  });
}

export async function findById(table, id) {
  const rows = await getTable(table);
  return rows.find((r) => r.id === Number(id)) ?? null;
}

export async function seedTables(data) {
  return withLock(async () => {
    for (const t of TABLES) {
      const rows = data[t] ?? [];
      await saveTable(t, rows);
      const maxId = rows.reduce((m, r) => Math.max(m, Number(r.id) || 0), 0);
      if (useKV) {
        const seq = await kv.get(`${PREFIX}seq:${t}`);
        if (!seq || Number(seq) < maxId) await kv.set(`${PREFIX}seq:${t}`, maxId);
      } else {
        const db = readLocalDb();
        db.seq[t] = maxId;
        writeLocalDb(db);
      }
    }
  });
}