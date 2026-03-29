// ── JWT helpers (Web Crypto API — works in CF Workers) ──

export interface JwtPayload {
  user_id: number;
  role: "buyer" | "seller" | "admin";
  seller_id?: number;
  exp: number;
  iat: number;
}

function base64url(data: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(data)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function decodeBase64url(str: string): string {
  return atob(str.replace(/-/g, "+").replace(/_/g, "/"));
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
  expiresInSeconds = 604800 // 7 days
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

export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const hashed = await hashPassword(password);
  return hashed === hash;
}
