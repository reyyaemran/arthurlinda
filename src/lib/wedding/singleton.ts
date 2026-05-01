/**
 * Single-tenant deployment: one `User` and one `Wedding` per database.
 * `deploymentId` is always this value — enforced with unique constraints in Prisma.
 */
export const SINGLETON_DEPLOYMENT_ID = "default" as const;
