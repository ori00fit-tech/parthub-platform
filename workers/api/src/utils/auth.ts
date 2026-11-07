// ── JWT helpers (Web Crypto API — works in CF Workers) ──

export interface JwtPayload {
  user_id: number;
  role: "buyer" | "seller" | "admin";
  seller_id?: number;
  tv?: number; // users.token_version when issued (see middlewares/auth.ts)
  exp: number;
  iat: number;
}

function base64url(data: BufferSource): string {
  const bytes = data instanceof ArrayBuffer ? new Uint8Array(data) : new Uint8Array(data.buffer, data.byteOffset, data.byteLength);

  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function decodeBase64url(str: string): string {
  const normalized = str.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  return atob(padded);
}

async function importKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

export async function signToken(
  payload: Omit<JwtPayload, "iat" | "exp">,
  secret: string,
  expiresInSeconds = 604800
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const fullPayload: JwtPayload = { ...payload, iat: now, exp: now + expiresInSeconds };

  const header = base64url(new TextEncoder().encode(JSON.stringify({ alg: "HS256", typ: "JWT" })));
  const body = base64url(new TextEncoder().encode(JSON.stringify(fullPayload)));
  const signingInput = `${header}.${body}`;

  const key = await importKey(secret);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(signingInput));

  return `${signingInput}.${base64url(signature)}`;
}

export async function verifyToken(token: string, secret: string): Promise<JwtPayload> {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Invalid token");

  const [header, body, sig] = parts as [string, string, string];
  const signingInput = `${header}.${body}`;

  const key = await importKey(secret);
  const sigBytes = Uint8Array.from(decodeBase64url(sig), (c) => c.charCodeAt(0));
  const valid = await crypto.subtle.verify("HMAC", key, sigBytes, new TextEncoder().encode(signingInput));

  if (!valid) throw new Error("Invalid signature");

  const payload = JSON.parse(decodeBase64url(body)) as JwtPayload;
  if (payload.exp < Math.floor(Date.now() / 1000)) throw new Error("Token expired");

  return payload;
}

// ── Password hashing ──
// New hashes: "pbkdf2$<iterations>$<salt b64url>$<hash b64url>" (PBKDF2-SHA256, random salt).
// Legacy hashes (unsalted SHA-256 hex) are still accepted so existing users can log in;
// the login route re-hashes them when needsRehash() is true.

const PBKDF2_ITERATIONS = 100_000; // Cloudflare Workers' maximum
const PBKDF2_PREFIX = "pbkdf2";

function bytesFromBase64url(str: string): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(decodeBase64url(str), (c) => c.charCodeAt(0));
}

async function pbkdf2(
  password: string,
  salt: Uint8Array<ArrayBuffer>,
  iterations: number
): Promise<Uint8Array<ArrayBuffer>> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations },
    key,
    256
  );
  return new Uint8Array(bits);
}

async function legacySha256Hex(password: string): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(password));
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i]! ^ b[i]!;
  return diff === 0;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(new ArrayBuffer(16)));
  const hash = await pbkdf2(password, salt, PBKDF2_ITERATIONS);
  return `${PBKDF2_PREFIX}$${PBKDF2_ITERATIONS}$${base64url(salt)}$${base64url(hash)}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  if (stored.startsWith(`${PBKDF2_PREFIX}$`)) {
    const [, iterStr, saltStr, hashStr] = stored.split("$");
    const iterations = Number(iterStr);
    if (!iterations || !saltStr || !hashStr) return false;
    const expected = bytesFromBase64url(hashStr);
    const actual = await pbkdf2(password, bytesFromBase64url(saltStr), iterations);
    return timingSafeEqual(actual, expected);
  }

  const enc = new TextEncoder();
  return timingSafeEqual(enc.encode(await legacySha256Hex(password)), enc.encode(stored));
}

export function needsRehash(stored: string): boolean {
  return !stored.startsWith(`${PBKDF2_PREFIX}$${PBKDF2_ITERATIONS}$`);
}
