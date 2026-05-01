/**
 * Creates the first (and only) admin user + default wedding when the DB is empty.
 * Run from project root: pnpm create-admin <email> <password> [phone]
 */
import path from "node:path";

import dotenv from "dotenv";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

import { createInitialAdmin } from "../src/lib/auth/auth-data";

function usage(): never {
  console.error(`
Usage:
  pnpm create-admin <email> <password> [phone]

Or set ADMIN_EMAIL and ADMIN_PASSWORD (optional ADMIN_PHONE) in the environment.
`);
  process.exit(1);
}

async function main() {
  const email =
    process.env.ADMIN_EMAIL?.trim() || process.argv[2]?.trim();
  const password =
    process.env.ADMIN_PASSWORD ?? process.argv[3];
  const phone =
    process.env.ADMIN_PHONE?.trim() || process.argv[4]?.trim() || undefined;

  if (!email || !password) usage();

  const result = await createInitialAdmin({ email, password, phone });
  if (!result.ok) {
    console.error(
      "An admin or wedding already exists. This command only runs on an empty database.",
    );
    process.exit(1);
  }
  console.log(`Admin created: ${email} (id ${result.userId})`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
