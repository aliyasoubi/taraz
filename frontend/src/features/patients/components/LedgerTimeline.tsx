import { Banknote } from 'lucide-react'
import { TxRow } from '@/features/transactions/components/TxRow'
import { t } from '@/shared/lib/i18n'
import { monthLabel } from '@/shared/lib/jalali'
import { Empty, ListSection, Money } from '@/shared/ui'
import type { Ledger } from '../ledger'

/** The patient's history, one grouped section per month, newest first. */
export function LedgerTimeline({ ledger }: { ledger: Ledger }) {
  if (ledger.months.length === 0) {
    return <Empty icon={<Banknote />} title={t('common.noTransactionsYet')} hint={t('patient.emptyHint')} />
  }
  return (
    <>
      {ledger.months.map((month) => (
        <ListSection
          key={month.key}
          className="first:mt-8"
          header={
            <>
              <span>{monthLabel(month.jy, month.jm)}</span>
              <span>
                {t('patient.monthChange')} <Money value={month.net} sign unit={false} />
              </span>
            </>
          }
        >
          {month.items.map((tx) => (
            <TxRow key={tx.id} tx={tx} />
          ))}
        </ListSection>
      ))}
    </>
  )
}
