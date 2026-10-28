import { Plus, Wallet } from 'lucide-react'
import { useState } from 'react'
import { useAccounts } from '@/features/accounts/api'
import { useTransactions } from '@/features/transactions/api'
import { TxRow } from '@/features/transactions/components/TxRow'
import { useTransactionSheets } from '@/features/transactions/TransactionSheets'
import { faDigits } from '@/shared/lib/format'
import { t } from '@/shared/lib/i18n'
import { jToIso, monthLabel, monthLength } from '@/shared/lib/jalali'
import {
  AnimatedMoney,
  Chip,
  Empty,
  IconButton,
  ListSection,
  MonthSwitcher,
  PageHeader,
  Skeleton,
  useMonthState,
} from '@/shared/ui'

/** The second tab: every payment of a month, like a bank statement, filterable by the account it went to. */
export function ReceiptsPage() {
  const [month, shift, dir] = useMonthState()
  const [accountId, setAccountId] = useState<number | null>(null)
  const { newTransaction } = useTransactionSheets()
  const accounts = (useAccounts().data ?? []).filter((a) => !a.is_archived)
  const { data, isLoading } = useTransactions({
    type: 'payment',
    from: jToIso({ ...month, jd: 1 }),
    to: jToIso({ ...month, jd: monthLength(month.jy, month.jm) }),
    account_id: accountId ?? undefined,
    limit: 1000,
  })
  const label = monthLabel(month.jy, month.jm)

  return (
    <div>
      <PageHeader
        title={t('receipts.title')}
        actions={
          <IconButton onClick={() => newTransaction({ type: 'payment' })} aria-label={t('patient.addPayment')}>
            <Plus className="size-[26px]" />
          </IconButton>
        }
      >
        <MonthSwitcher value={month} onShift={shift} dir={dir} />
      </PageHeader>

      <div className="px-4">
        <div className="rounded-[12px] bg-surface px-4 pt-3.5 pb-4">
          <p className="text-[13px] text-ink-2">{t('receipts.total', { month: label })}</p>
          {data ? (
            <>
              <AnimatedMoney value={data.sum_amount} maxSize={34} className="mt-0.5 font-bold tracking-tight" />
              <p className="mt-0.5 text-[13px] text-ink-2">{t('receipts.count', { n: faDigits(data.total) })}</p>
            </>
          ) : (
            <Skeleton className="mt-2 h-14" />
          )}
        </div>

        {accounts.length > 1 && (
          <div className="-mx-4 mt-4 no-scrollbar flex gap-2 overflow-x-auto px-4">
            <Chip active={accountId === null} onClick={() => setAccountId(null)}>
              {t('receipts.allAccounts')}
            </Chip>
            {accounts.map((a) => (
              <Chip key={a.id} active={accountId === a.id} onClick={() => setAccountId(a.id)}>
                {a.title}
              </Chip>
            ))}
          </div>
        )}

        {isLoading ? (
          <Skeleton className="mt-4 h-72" />
        ) : !data?.items.length ? (
          <Empty icon={<Wallet />} title={t('receipts.empty')} hint={t('receipts.emptyHint')} />
        ) : (
          <ListSection className="mt-4">
            {data.items.map((tx) => (
              <TxRow key={tx.id} tx={tx} showPatient />
            ))}
          </ListSection>
        )}
      </div>
    </div>
  )
}
