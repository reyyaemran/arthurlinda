export function getAuthSecret(): Uint8Array {
  const raw = process.env.AUTH_SECRET;
  if (raw && raw.length >= 32) {
    return new TextEncoder().encode(raw);
  }
  if (process.env.NODE_ENV === "development") {
    return new TextEncoder().encode(
      "dev-auth-secret-min-32-chars!!".padEnd(32, "x"),
    );
  }
  throw new Error(
    "AUTH_SECRET must be set to at least 32 characters (e.g. openssl rand -hex 32)",
  );
}
