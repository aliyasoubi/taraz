import { motion } from 'motion/react'
import type { BreakdownRow } from '@/shared/api/types'
import { faDigits } from '@/shared/lib/format'
import { t } from '@/shared/lib/i18n'
import { accountAccent } from '@/shared/lib/labels'
import { Money, smooth } from '@/shared/ui'

/** Receipts split by account or method: one list row each, with a thin share bar under the name. */
export function Breakdown({ rows, total }: { rows: BreakdownRow[]; total: number }) {
  return (
    <>
      {rows.map((r, i) => {
        const pct = total > 0 ? r.amount / total : 0
        const colour = r.color ? accountAccent(r.color) : 'var(--brand)'
        return (
          <div key={r.key} className="group ps-4">
            <div className="relative py-2.5 pe-4 after:absolute after:inset-x-0 after:bottom-0 after:h-px after:origin-bottom after:scale-y-50 after:bg-line-2 group-last:after:hidden">
              <div className="flex items-baseline justify-between gap-3">
                <span className="truncate text-[17px]">
                  {r.label}{' '}
                  <span className="text-[13px] text-ink-2">{t('common.itemsCount', { n: faDigits(r.count) })}</span>
                </span>
                <Money value={r.amount} compact className="shrink-0 text-[17px] text-ink-2" />
              </div>
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-fill">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: colour }}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.max(2, pct * 100)}%` }}
                  transition={{ ...smooth, delay: i * 0.04 }}
                />
              </div>
            </div>
          </div>
        )
      })}
    </>
  )
}
