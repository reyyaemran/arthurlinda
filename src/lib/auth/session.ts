import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

import { findUserById } from "@/lib/auth/auth-data";

import { getAuthSecret } from "./auth-secret";
import { SESSION_COOKIE } from "./session-constants";

export { SESSION_COOKIE };

const SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 7; // 7 days

export async function signSessionToken(userId: string): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SEC}s`)
    .sign(getAuthSecret());
}

export async function verifySessionToken(token: string) {
  const { payload } = await jwtVerify(token, getAuthSecret());
  const sub = payload.sub;
  if (!sub) throw new Error("Invalid token");
  return sub;
}

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  avatar: string;
};

export async function getSession(): Promise<{
  user: SessionUser;
} | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const userId = await verifySessionToken(token);
    const user = await findUserById(userId);
    if (!user) return null;
    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name ?? user.email.split("@")[0] ?? "Admin",
        phone: user.phone,
        avatar: user.avatarUrl ?? "",
      },
    };
  } catch {
    return null;
  }
}

export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SEC,
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}
