import { motion } from 'motion/react'
import { Banknote } from 'lucide-react'
import { TxRow } from '@/features/transactions/components/TxRow'
import { t } from '@/shared/lib/i18n'
import { monthLabel } from '@/shared/lib/jalali'
import { Card, Empty, listVariants, Money } from '@/shared/ui'
import type { Ledger } from '../ledger'

/** The patient's statement, month by month, with the balance after every row. */
export function LedgerTimeline({ ledger }: { ledger: Ledger }) {
  if (ledger.months.length === 0) {
    return (
      <Card>
        <Empty
          icon={<Banknote className="size-7" />}
          title={t('common.noTransactionsYet')}
          hint={t('patient.emptyHint')}
        />
      </Card>
    )
  }
  return (
    <div className="space-y-4">
      {ledger.months.map((month) => (
        <Card key={month.key} className="p-1.5">
          <div className="flex items-center justify-between px-3 pt-2.5 pb-1">
            <span className="text-[13px] font-bold text-ink-2">{monthLabel(month.jy, month.jm)}</span>
            <span className="text-[12px] text-ink-3">
              {t('patient.monthChange')}{' '}
              <Money value={month.net} sign tone="auto" unit={false} className="font-semibold" />
            </span>
          </div>
          <motion.div variants={listVariants} initial="hidden" animate="show">
            {month.items.map((tx) => (
              <TxRow key={tx.id} tx={tx} runningBalance={ledger.runningBalance.get(tx.id)} />
            ))}
          </motion.div>
        </Card>
      ))}
    </div>
  )
}
