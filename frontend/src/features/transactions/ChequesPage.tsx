import { motion } from 'motion/react'
import { CalendarCheck2 } from 'lucide-react'
import { useState } from 'react'
import { Card, Empty, listVariants, Money, PageHeader, Segmented, Skeleton } from '@/shared/ui'
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
      <PageHeader back title={t('cheques.title')} subtitle={t('cheques.subtitle')} />
      <div className="space-y-4 px-4">
        <Segmented
          value={status}
          onChange={setStatus}
          options={[
            { value: 'pending', label: t('cheques.pending') },
            { value: 'cleared', label: t('cheques.cleared') },
            { value: 'bounced', label: t('cheques.bounced') },
          ]}
        />
        {data && (
          <div className="flex items-center justify-between rounded-3xl border border-line bg-surface/70 px-4 py-3">
            <span className="text-sm text-ink-2">{t('common.chequesCount', { n: faDigits(data.total) })}</span>
            <Money value={data.sum_amount} className="text-lg font-extrabold" />
          </div>
        )}
        {isLoading ? (
          <Skeleton className="h-60" />
        ) : items.length === 0 ? (
          <Card>
            <Empty icon={<CalendarCheck2 className="size-7" />} title={t('cheques.empty')} />
          </Card>
        ) : (
          <>
            {overdue.length > 0 && (
              <Card className="border-debt/30 p-1.5">
                <p className="px-3 pt-2.5 pb-1 text-[13px] font-bold text-debt">{t('cheques.overdue')}</p>
                <motion.div variants={listVariants} initial="hidden" animate="show">
                  {overdue.map((tx) => (
                    <TxRow key={tx.id} tx={tx} showPatient />
                  ))}
                </motion.div>
              </Card>
            )}
            {upcoming.length > 0 && (
              <Card className="p-1.5">
                <motion.div variants={listVariants} initial="hidden" animate="show">
                  {upcoming.map((tx) => (
                    <TxRow key={tx.id} tx={tx} showPatient />
                  ))}
                </motion.div>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  )
}
