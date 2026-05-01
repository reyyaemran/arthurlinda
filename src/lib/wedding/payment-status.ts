import type { PaymentStatus } from "@/types/wedding";

/**
 * Single source of truth for an expense's effective payment status.
 *
 * Rules (in order):
 *  1. Fully paid (paidAmount ≥ amount, with amount > 0) → `PAID`
 *  2. Past due and not fully paid                       → `OVERDUE`
 *  3. Some money paid but not in full                   → `PARTIAL`
 *  4. Otherwise                                         → `UNPAID`
 *
 * The function is pure — pass `now` for deterministic tests.
 */
export function derivePaymentStatus({
  amount,
  paidAmount,
  dueDate,
  now = new Date(),
}: {
  amount: number;
  paidAmount: number;
  dueDate: Date | null | undefined;
  now?: Date;
}): PaymentStatus {
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  const safePaid = Math.max(0, Number.isFinite(paidAmount) ? paidAmount : 0);

  if (safeAmount > 0 && safePaid >= safeAmount) return "PAID";

  if (dueDate) {
    const due = dueDate instanceof Date ? dueDate : new Date(dueDate);
    if (!Number.isNaN(due.getTime())) {
      const dueMidnight = new Date(due.getFullYear(), due.getMonth(), due.getDate());
      const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      if (dueMidnight.getTime() < todayMidnight.getTime()) return "OVERDUE";
    }
  }

  if (safePaid > 0) return "PARTIAL";
  return "UNPAID";
}
