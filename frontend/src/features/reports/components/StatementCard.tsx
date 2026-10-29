import { AnimatePresence, motion } from 'motion/react'
import { ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import type { StatementRow } from '@/shared/api/types'
import { cx } from '@/shared/lib/cx'
import { t } from '@/shared/lib/i18n'
import { Avatar, Money, smooth } from '@/shared/ui'

/** One patient's month as a list row: opening and closing balance, tap to show the movements. */
export function StatementCard({ row }: { row: StatementRow }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="group ps-4">
      <div className="relative after:absolute after:inset-x-0 after:bottom-0 after:h-px after:origin-bottom after:scale-y-50 after:bg-line-2 group-last:after:hidden">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex w-full items-center gap-3 py-2.5 pe-4 text-start"
        >
          <Avatar name={row.name} size={32} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[17px]">{row.name}</span>
            <span className="block text-[13px] text-ink-2">
              {t('common.openingOfMonth')} <Money value={row.opening} compact unit={false} />
            </span>
          </span>
          <span className="text-end">
            <Money value={row.closing} tone="auto" className="text-[17px]" unit={false} />
            <span className="block text-[11px] text-ink-2">{t('common.endOfMonth')}</span>
          </span>
          <ChevronDown className={cx('size-4 text-ink-3 transition-transform', open && 'rotate-180')} />
        </button>
        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={smooth}
              className="overflow-hidden"
            >
              <div className="space-y-1.5 ps-11 pe-4 pb-3 text-[15px]">
                <Line label={t('reports.charge')} value={row.charged} tone="text-debt" />
                <Line label={t('reports.payment')} value={row.paid} tone="text-credit" />
                <Line label={t('reports.discount')} value={row.discounted} />
                <Line label={t('reports.refund')} value={row.refunded} />
                {row.pending_cheques > 0 && (
                  <Line label={t('common.pendingCheque')} value={row.pending_cheques} tone="text-warn" />
                )}
                <Link to={`/patients/${row.id}`} className="block pt-1 text-brand">
                  {t('common.viewLedger')}
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

function Line({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-ink-2">{label}</span>
      <Money value={value} unit={false} className={tone} />
    </div>
  )
}
