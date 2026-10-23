import { motion } from 'motion/react'
import type { BreakdownRow } from '@/shared/api/types'
import { faDigits } from '@/shared/lib/format'
import { t } from '@/shared/lib/i18n'
import { accountAccent } from '@/shared/lib/labels'
import { Money } from '@/shared/ui'

/** Receipts split by account or method, as proportional bars. */
export function Breakdown({ rows, total }: { rows: BreakdownRow[]; total: number }) {
  return (
    <div className="space-y-3.5">
      {rows.map((r, i) => {
        const pct = total > 0 ? r.amount / total : 0
        return (
          <div key={r.key}>
            <div className="mb-1.5 flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 font-semibold">
                <span
                  className="size-2.5 rounded-full"
                  style={{ background: r.color ? accountAccent(r.color) : 'var(--ink-3)' }}
                />
                {r.label}
                <span className="text-[11px] font-normal text-ink-3">
                  {t('common.itemsCount', { n: faDigits(r.count) })}
                </span>
              </span>
              <Money value={r.amount} compact className="font-bold" />
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-line">
              <motion.div
                className="h-full rounded-full"
                style={{ background: r.color ? accountAccent(r.color) : 'var(--brand)' }}
                initial={{ width: 0 }}
                animate={{ width: `${Math.max(2, pct * 100)}%` }}
                transition={{ type: 'spring', stiffness: 90, damping: 20, delay: i * 0.05 }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
