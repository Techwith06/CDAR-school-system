import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { randomUUID } from "node:crypto";
import { createClient } from "@vercel/kv";

const SECRET = process.env.JWT_SECRET || "dev-secret-do-not-use-in-prod";
const ACCESS_TTL = Number(process.env.JWT_ACCESS_TTL || 3600);
const REFRESH_TTL = Number(process.env.JWT_REFRESH_TTL || 2592000);

const useKV = Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);

let kv;
if (useKV) {
  kv = createClient({
    url: process.env.KV_REST_API_URL,
    token: process.env.KV_REST_API_TOKEN,
  });
}

const BLACKLIST_PREFIX = "cdar:blacklist:";

const localBlacklist = new Set();

export function hashPassword(plain) {
  return bcrypt.hashSync(plain || "", 10);
}

export function verifyPassword(plain, hash) {
  if (!hash) return false;
  try {
    return bcrypt.compareSync(plain || "", hash);
  } catch {
    return false;
  }
}

export function issueTokens(user) {
  const jtiAccess = randomUUID();
  const jtiRefresh = randomUUID();
  const accessToken = jwt.sign({ sub: user.id, type: "access", jti: jtiAccess }, SECRET, {
    expiresIn: ACCESS_TTL,
  });
  const refreshToken = jwt.sign({ sub: user.id, type: "refresh", jti: jtiRefresh }, SECRET, {
    expiresIn: REFRESH_TTL,
  });
  return { access_token: accessToken, refresh_token: refreshToken, expires_in: ACCESS_TTL };
}

export function verifyToken(token) {
  try {
    const payload = jwt.verify(token, SECRET);
    return payload;
  } catch {
    return null;
  }
}

export async function blacklistRefresh(token) {
  const payload = verifyToken(token);
  if (!payload || payload.type !== "refresh") return;
  const ttl = Math.max(1, Math.floor(payload.exp - Date.now() / 1000));
  if (useKV) {
    await kv.set(`${BLACKLIST_PREFIX}${payload.jti}`, 1, { ex: ttl });
  } else {
    localBlacklist.add(payload.jti);
  }
}

export async function isRefreshBlacklisted(token) {
  const payload = verifyToken(token);
  if (!payload || payload.type !== "refresh") return true;
  if (useKV) return Boolean(await kv.get(`${BLACKLIST_PREFIX}${payload.jti}`));
  return localBlacklist.has(payload.jti);
}

export async function authenticate(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  const payload = token ? verifyToken(token) : null;
  if (!payload || payload.type !== "access") {
    return res.status(401).json({
      error: { code: "NOT_AUTHENTICATED", message: "Authentication credentials were not provided." },
    });
  }
  req.auth = { userId: payload.sub, payload };
  next();
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: { code: "PERMISSION_DENIED", message: "You do not have permission to perform this action." },
      });
    }
    next();
  };
}