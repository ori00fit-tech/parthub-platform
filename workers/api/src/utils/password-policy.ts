// Which passwords PartHub refuses (registration and password change).
// Short ones, the well-known ones (including the sample passwords once
// used for test accounts: Admin123!, Seller123!, Buyer123!), the site's
// name, the person's e-mail name, and strings like "aaaaaaaa".
// Admin accounts need 10 characters at least.

const COMMON = new Set([
  "password", "password1", "password123", "password123!", "motdepasse", "motdepasse123", "azerty", "azerty123", "azertyuiop",
  "qwerty", "qwerty123", "qwertyuiop", "12345678", "123456789", "1234567890", "123123123", "11111111", "00000000",
  "iloveyou", "welcome1", "welcome123", "letmein", "abc12345", "maroc123", "morocco123", "casablanca", "bismillah",
  "admin", "admin123", "admin123!", "administrator", "seller123", "seller123!", "buyer123", "buyer123!", "test1234", "test123!",
]);

export function passwordProblem(password: unknown, who: { email?: string | null; name?: string | null; role?: string | null } = {}): string | null {
  const pw = String(password ?? "");
  const min = who.role === "admin" ? 10 : 8;
  if (pw.length < min) return `The password must have at least ${min} characters`;
  if (pw.length > 200) return "The password is too long";
  const low = pw.toLowerCase();
  if (COMMON.has(low)) return "This password is too common: choose another one";
  if (low.includes("parthub")) return "The password must not contain the site's name";
  const local = String(who.email || "").split("@")[0]!.toLowerCase();
  if (local.length >= 4 && low.includes(local)) return "The password must not contain your e-mail name";
  if (new Set(low).size <= 3) return "The password is too simple";
  return null;
}
