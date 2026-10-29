import { CalendarCheck2 } from 'lucide-react'
import { useState } from 'react'
import { Empty, ListRow, ListSection, Money, PageHeader, Segmented, Skeleton } from '@/shared/ui'
import { TxRow } from '@/features/transactions/components/TxRow'
import { faDigits } from '@/shared/lib/format'
import { daysBetween, todayIso } from '@/shared/lib/jalali'
import { useTransactions } from '@/features/transactions/api'
import type { ChequeStatus } from '@/shared/api/types'
import { t } from '@/shared/lib/i18n'

export function ChequesPage() {
  const [status, setStatus] = useState<ChequeStatus>('pending')
  const { data, isLoading } = useTransactions({ method: 'cheque', type: 'payment', cheque_status: status, limit: 500 })
  const today = todayIso()
  const items = data?.items ?? []
  const overdue =
    status === 'pending' ? items.filter((tx) => tx.cheque_due_on && daysBetween(today, tx.cheque_due_on) < 0) : []
  const upcoming = status === 'pending' ? items.filter((tx) => !overdue.includes(tx)) : items

  return (
    <div>
      <PageHeader back title={t('cheques.title')} subtitle={t('cheques.subtitle')}>
        <Segmented
          value={status}
          onChange={setStatus}
          options={[
            { value: 'pending', label: t('cheques.pending') },
            { value: 'cleared', label: t('cheques.cleared') },
            { value: 'bounced', label: t('cheques.bounced') },
          ]}
        />
      </PageHeader>
      <div className="px-4">
        {data && (
          <ListSection className="mt-2">
            <ListRow
              title={t('common.chequesCount', { n: faDigits(data.total) })}
              value={<Money value={data.sum_amount} className="text-ink" />}
            />
          </ListSection>
        )}
        {isLoading ? (
          <Skeleton className="mt-8 h-60" />
        ) : items.length === 0 ? (
          <Empty icon={<CalendarCheck2 />} title={t('cheques.empty')} />
        ) : (
          <>
            {overdue.length > 0 && (
              <ListSection header={<span className="text-debt">{t('cheques.overdue')}</span>}>
                {overdue.map((tx) => (
                  <TxRow key={tx.id} tx={tx} showPatient />
                ))}
              </ListSection>
            )}
            {upcoming.length > 0 && (
              <ListSection>
                {upcoming.map((tx) => (
                  <TxRow key={tx.id} tx={tx} showPatient />
                ))}
              </ListSection>
            )}
          </>
        )}
      </div>
    </div>
  )
}
