import type { Category } from './categories';

/**
 * Applying a deposit: once the treatment a deposit was paid for is entered,
 * the deposit's payments move onto that entry, so it shows what is really
 * left on it and the money counts toward its category and doctor. No money
 * comes in — only which entry the payments belong to changes, so the
 * patient's balance stays where it was.
 */

/** A payment held on one of the patient's deposits. */
export interface HeldPayment {
  id: string;
  entryId: string;
  amount: number;
}

export interface DepositPlan<P extends HeldPayment> {
  /** Payments that move whole onto the entry. */
  move: P[];
  /** The last payment, when only part of it is needed: `amount` moves, the rest stays. */
  split: { payment: P; amount: number } | null;
  /** Deposits left with no payment on them. */
  emptied: string[];
  applied: number;
}

/** A deposit can go toward a cost that still has something owing on it. */
export function takesDeposits(entry: {
  category: Category;
  remaining: number;
}): boolean {
  return entry.category !== 'deposit' && entry.remaining > 0;
}

/** Takes `held` in order (oldest first) until `owed` is covered. */
export function planDeposits<P extends HeldPayment>(
  owed: number,
  held: readonly P[],
): DepositPlan<P> {
  const move: P[] = [];
  let split: DepositPlan<P>['split'] = null;
  let left = owed;
  for (const p of held) {
    if (left <= 0) break;
    if (p.amount <= left) {
      move.push(p);
      left -= p.amount;
    } else {
      split = { payment: p, amount: left };
      left = 0;
    }
  }
  const deposits = [...new Set(held.map((p) => p.entryId))];
  const emptied = deposits.filter((id) =>
    held.every((p) => p.entryId !== id || move.includes(p)),
  );
  return { move, split, emptied, applied: owed - left };
}
