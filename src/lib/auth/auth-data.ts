import type { User } from "@prisma/client";

import { hashPassword } from "@/lib/auth/password";
import { buildDefaultWeddingCreate } from "@/lib/wedding/bootstrap";
import { getPrisma } from "@/lib/prisma";
import { SINGLETON_DEPLOYMENT_ID } from "@/lib/wedding/singleton";

export async function countUsers(): Promise<number> {
  return getPrisma().user.count();
}

export async function findUserByEmail(email: string): Promise<User | null> {
  return getPrisma().user.findUnique({ where: { email } });
}

export async function findUserById(id: string): Promise<User | null> {
  return getPrisma().user.findUnique({ where: { id } });
}

export type CreateInitialAdminError = "exists";

/**
 * Creates the single admin user + default wedding when the database is empty.
 * Used by the CLI only (`pnpm create-admin`); there is no web sign-up flow.
 */
export async function createInitialAdmin(params: {
  email: string;
  password: string;
  phone?: string | null;
}): Promise<
  { ok: true; userId: string } | { ok: false; error: CreateInitialAdminError }
> {
  const prisma = getPrisma();
  const email = params.email.trim().toLowerCase();
  const phone = params.phone?.trim() || null;

  try {
    const user = await prisma.$transaction(async (tx) => {
      const existingUsers = await tx.user.count();
      const existingWeddings = await tx.wedding.count();
      if (existingUsers > 0 || existingWeddings > 0) {
        throw new Error("EXISTS");
      }
      const passwordHash = await hashPassword(params.password);
      const u = await tx.user.create({
        data: {
          deploymentId: SINGLETON_DEPLOYMENT_ID,
          email,
          phone,
          passwordHash,
          emailVerified: new Date(),
          name: email.split("@")[0] ?? "Admin",
        },
      });
      await tx.wedding.create({
        data: buildDefaultWeddingCreate(u.id),
      });
      return u;
    });
    return { ok: true, userId: user.id };
  } catch (e) {
    if (e instanceof Error && e.message === "EXISTS") {
      return { ok: false, error: "exists" };
    }
    throw e;
  }
}
