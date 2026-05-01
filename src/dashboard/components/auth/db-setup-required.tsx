import { Terminal, Database } from "lucide-react";

/**
 * Rendered by admin pages when DATABASE_URL is not set.
 * Gives Arthur / Linda clear copy-paste steps to get the app running.
 */
export function DbSetupRequired() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-lg space-y-6 text-center">
        <div className="flex justify-center">
          <Database className="h-10 w-10 text-muted-foreground" />
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-semibold tracking-tight">Database not configured</h1>
          <p className="text-sm text-muted-foreground">
            This app needs a valid database connection (SQLite or PostgreSQL). Create a{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">.env.local</code>{" "}
            file in the project root with the variables below, then restart the dev server.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-muted/40 p-4 text-left space-y-3">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
            <Terminal className="h-3.5 w-3.5" />
            .env.local
          </div>
          <pre className="text-xs leading-relaxed font-mono text-foreground whitespace-pre-wrap break-all">
{`# SQLite local file (no server needed)
DATABASE_URL="file:./dev.db"

# JWT secret — run: openssl rand -hex 32
AUTH_SECRET="your-32-char-secret-here"`}
          </pre>
        </div>

        <div className="rounded-xl border border-border bg-muted/40 p-4 text-left space-y-3">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
            <Terminal className="h-3.5 w-3.5" />
            Then run in terminal
          </div>
          <pre className="text-xs leading-relaxed font-mono text-foreground">
{`npx prisma migrate dev --name init
pnpm create-admin you@example.com 'your-password'
# restart: npm run dev`}
          </pre>
        </div>

        <p className="text-xs text-muted-foreground">
          After the migration and create-admin command, reload /admin/login and sign in.
        </p>
      </div>
    </main>
  );
}
