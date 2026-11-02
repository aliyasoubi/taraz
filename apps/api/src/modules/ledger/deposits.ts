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

export interface DepositPlan {
  /** Payments that move whole onto the entry. */
  move: string[];
  /** The last payment, when only part of it is needed: `amount` moves, the rest stays. */
  split: { id: string; amount: number } | null;
  /** Deposits left with no payment on them. */
  emptied: string[];
  applied: number;
}

/** Takes `held` in order (oldest first) until `owed` is covered. */
export function planDeposits(
  owed: number,
  held: readonly HeldPayment[],
): DepositPlan {
  const move: string[] = [];
  let split: DepositPlan['split'] = null;
  let left = owed;
  for (const p of held) {
    if (left <= 0) break;
    if (p.amount <= left) {
      move.push(p.id);
      left -= p.amount;
    } else {
      split = { id: p.id, amount: left };
      left = 0;
    }
  }
  const moved = new Set(move);
  const deposits = [...new Set(held.map((p) => p.entryId))];
  const emptied = deposits.filter((id) =>
    held.every((p) => p.entryId !== id || moved.has(p.id)),
  );
  return { move, split, emptied, applied: owed - left };
}
