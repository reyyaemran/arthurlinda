import { Terminal, UserPlus } from "lucide-react";

/**
 * Shown on /admin/login when the database has no admin user yet.
 * First admin is created via `pnpm create-admin` (not in the browser).
 */
export function NoAdminYet() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-lg space-y-6 text-center">
        <div className="flex justify-center">
          <UserPlus className="h-10 w-10 text-muted-foreground" />
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-semibold tracking-tight">No admin account yet</h1>
          <p className="text-sm text-muted-foreground">
            Sign-up in the browser is disabled. Create the first admin from the project folder using the
            command below, then return here to sign in.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-muted/40 p-4 text-left space-y-3">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
            <Terminal className="h-3.5 w-3.5" />
            Terminal
          </div>
          <pre className="text-xs leading-relaxed font-mono text-foreground whitespace-pre-wrap break-all">
{`pnpm create-admin you@example.com 'your-secure-password'

# optional phone (digits, 8–15):
# pnpm create-admin you@example.com 'password' +855123456789`}
          </pre>
        </div>

        <p className="text-xs text-muted-foreground">
          Uses <code className="rounded bg-muted px-1 py-0.5 font-mono">DATABASE_URL</code> from{" "}
          <code className="rounded bg-muted px-1 py-0.5 font-mono">.env.local</code>. Reload this page after
          the command succeeds.
        </p>
      </div>
    </main>
  );
}
