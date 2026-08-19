import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import bcrypt from "bcryptjs";
import { put } from "@vercel/blob";

import * as store from "../src/store.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SEED_FILE = path.join(__dirname, "..", "data", "seed.json");
const MEDIA_ROOT = path.resolve(__dirname, "..", "..", "app", "backend", "media");

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@gmail.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "cdaradmin";
const DEFAULT_PASSWORD = process.env.DEFAULT_PASSWORD || "Cdar@2024";

function exists(p) {
  return fs.existsSync(p);
}

async function uploadFile(relativePath) {
  const local = path.join(MEDIA_ROOT, relativePath);
  if (!exists(local)) return null;
  const buffer = fs.readFileSync(local);
  const destPath = `${relativePath.replace(/\\/g, "/")}`;
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const blob = await put(destPath, buffer, { access: "public" });
      return blob.url;
    } catch (err) {
      console.warn(`  ! blob upload failed for ${relativePath}: ${err.message}`);
    }
  }
  return null;
}

async function main() {
  const seed = JSON.parse(fs.readFileSync(SEED_FILE, "utf-8"));
  console.log("Seeding tables:", Object.keys(seed).join(", "));

  console.log("Uploading avatars/material files to Vercel Blob...");
  const avatarUrls = new Map();
  for (const u of seed.users) {
    if (!u.profile_picture) continue;
    const url = await uploadFile(u.profile_picture);
    if (url) avatarUrls.set(u.profile_picture, url);
  }
  const materialUrls = new Map();
  for (const m of seed.materials) {
    if (!m.file) continue;
    const url = await uploadFile(m.file);
    if (url) materialUrls.set(m.file, url);
  }

  console.log(`Setting admin (email=${ADMIN_EMAIL}) and default password for other users...`);
  const users = seed.users.map((u) => {
    const isAdmin = u.role === "admin";
    return {
      ...u,
      email: isAdmin ? ADMIN_EMAIL : u.email,
      password: bcrypt.hashSync(isAdmin ? ADMIN_PASSWORD : DEFAULT_PASSWORD, 10),
      profile_picture: avatarUrls.get(u.profile_picture) ?? (u.profile_picture ? null : null),
      is_staff: isAdmin ? true : u.is_staff,
    };
  });

  const materials = seed.materials.map((m) => ({
    ...m,
    file_url: materialUrls.get(m.file) ?? m.file_url,
    file: materialUrls.get(m.file) ?? m.file,
  }));

  const data = { ...seed, users, materials };
  await store.seedTables(data);
  console.log("Seed complete.");
  console.log("Admin login:", ADMIN_EMAIL, "/", ADMIN_PASSWORD);
  console.log("Other users password:", DEFAULT_PASSWORD);
  console.log("Storage:", process.env.KV_REST_API_URL ? "Vercel KV" : "local JSON (data/db.json)");
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});