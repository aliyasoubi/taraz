import { AnimatePresence, motion } from 'motion/react'
import { ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import type { StatementRow } from '@/shared/api/types'
import { cx } from '@/shared/lib/cx'
import { t } from '@/shared/lib/i18n'
import { Avatar, itemVariants, Money } from '@/shared/ui'

/** One patient's month: opening and closing balance, expandable to the movements. */
export function StatementCard({ row }: { row: StatementRow }) {
  const [open, setOpen] = useState(false)
  return (
    <motion.div variants={itemVariants} layout className="overflow-hidden rounded-3xl border border-line bg-surface/70">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 p-3 text-start"
      >
        <Avatar name={row.name} size={40} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{row.name}</p>
          <p className="text-[11px] text-ink-3">
            {t('common.openingOfMonth')} <Money value={row.opening} unit={false} />
          </p>
        </div>
        <div className="text-end">
          <Money value={row.closing} tone="auto" className="font-bold" unit={false} />
          <p className="text-[10px] text-ink-3">{t('common.endOfMonth')}</p>
        </div>
        <ChevronDown className={cx('size-4 text-ink-3 transition-transform', open && 'rotate-180')} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-2 gap-2 border-t border-line p-3 text-[13px]">
              <Line label={t('reports.charge')} value={row.charged} tone="text-debt" />
              <Line label={t('reports.payment')} value={row.paid} tone="text-credit" />
              <Line label={t('reports.discount')} value={row.discounted} />
              <Line label={t('reports.refund')} value={row.refunded} />
              {row.pending_cheques > 0 && (
                <Line label={t('common.pendingCheque')} value={row.pending_cheques} tone="text-warn" />
              )}
              <Link
                to={`/patients/${row.id}`}
                className="col-span-2 mt-1 rounded-xl bg-surface-2 py-2 text-center font-semibold text-brand"
              >
                {t('common.viewLedger')}
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function Line({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-surface-2/60 px-3 py-2">
      <span className="text-ink-3">{label}</span>
      <Money value={value} unit={false} className={cx('font-semibold', tone)} />
    </div>
  )
}
