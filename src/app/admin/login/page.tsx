import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminLoginForm } from "@/dashboard/components/auth/admin-login-form";
import { DbSetupRequired } from "@/dashboard/components/auth/db-setup-required";
import { NoAdminYet } from "@/dashboard/components/auth/no-admin-yet";
import { countUsers } from "@/lib/auth/auth-data";
import { getSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sign in",
};

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  if (!process.env.DATABASE_URL) return <DbSetupRequired issue="missing_env" />;

  const session = await getSession();
  if (session) redirect("/admin");

  let userCount: number;
  try {
    userCount = await countUsers();
  } catch (error) {
    console.error("Failed to query users for admin login:", error);
    return <DbSetupRequired issue="connection" />;
  }
  if (userCount === 0) return <NoAdminYet />;

  const sp = await searchParams;
  let prefilledEmail: string | undefined;
  if (typeof sp.email === "string") {
    try {
      prefilledEmail = decodeURIComponent(sp.email);
    } catch {
      prefilledEmail = undefined;
    }
  }

  return (
    <main className="flex min-h-svh flex-col items-center justify-center bg-background px-6 py-16">
      <div className="w-full max-w-sm">
        {/* A · L logo */}
        <div
          className="mb-10 flex items-baseline justify-center gap-0"
          style={{ fontFamily: "var(--font-cormorant)" }}
        >
          <span className="text-[2.1rem] font-normal tracking-[0.06em] text-primary leading-none">A</span>
          <span className="mx-1.5 text-[1.4rem] font-normal text-primary/40 leading-none">·</span>
          <span className="text-[2.1rem] font-normal tracking-[0.06em] text-primary leading-none">L</span>
        </div>

        <h1
          className="mb-10 text-center text-[2.35rem] font-normal leading-tight tracking-[0.02em] text-foreground sm:text-[2.55rem]"
          style={{ fontFamily: "var(--font-cormorant)" }}
        >
          Sign in
        </h1>

        <AdminLoginForm prefilledEmail={prefilledEmail} />

        <p className="mt-10 text-center">
          <Link
            href="/"
            className="text-[10px] tracking-[0.22em] uppercase text-muted-foreground/50 transition-colors hover:text-primary/70"
          >
            Back to invitation
          </Link>
        </p>
      </div>
    </main>
  );
}
