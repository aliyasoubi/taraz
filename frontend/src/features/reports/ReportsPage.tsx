import { motion } from 'motion/react'
import { Download, FileSpreadsheet, Users } from 'lucide-react'
import { useState } from 'react'
import { useMonthlyReport } from '@/features/reports/api'
import { TxRow } from '@/features/transactions/components/TxRow'
import { download, qs } from '@/shared/api/client'
import { cx } from '@/shared/lib/cx'
import { faDigits } from '@/shared/lib/format'
import { t } from '@/shared/lib/i18n'
import { formatJ } from '@/shared/lib/jalali'
import {
  AnimatedMoney,
  Button,
  Card,
  Empty,
  listVariants,
  Money,
  MonthSwitcher,
  PageHeader,
  SectionTitle,
  Segmented,
  Skeleton,
  useMonthState,
} from '@/shared/ui'
import { Breakdown } from './components/Breakdown'
import { Kpi } from './components/Kpi'
import { StatementCard } from './components/StatementCard'

export function ReportsPage() {
  const [month, shift, dir] = useMonthState()
  const { data, isFetching } = useMonthlyReport(month.jy, month.jm)
  const [view, setView] = useState<'debtors' | 'all'>('debtors')
  const rows = (data?.rows ?? []).filter((r) => (view === 'debtors' ? r.closing > 0 : true))

  return (
    <div>
      <PageHeader title={t('reports.title')} subtitle={t('reports.subtitle')} />
      <div className="space-y-4 px-4">
        <MonthSwitcher value={month} onShift={shift} dir={dir} />

        <motion.div
          className={cx(
            'relative overflow-hidden rounded-[30px] border border-line bg-surface/80 p-5 transition-opacity',
            isFetching && 'opacity-70',
          )}
        >
          <div className="pointer-events-none absolute -top-20 -left-20 size-56 rounded-full bg-debt/20 blur-3xl" />
          <p className="relative text-[13px] text-ink-3">
            {data
              ? t('reports.receivableAt', {
                  month: data.month.label.split(' ')[0] ?? '',
                  date: formatJ(data.month.end, 'short'),
                })
              : t('reports.receivableAtMonth')}
          </p>
          {data ? (
            <AnimatedMoney
              value={data.closing_receivable}
              maxSize={36}
              className="relative font-black tracking-tight text-debt"
            />
          ) : (
            <Skeleton className="mt-2 h-10 w-48" />
          )}
          <p className="relative mt-1 text-[12px] text-ink-3">
            {data ? t('reports.debtorsCount', { n: faDigits(data.debtors_count) }) : ''}
            {data && data.closing_credit > 0 && (
              <>
                {' · '}
                {t('reports.prepaid')} <Money value={data.closing_credit} tone="credit" compact />
              </>
            )}
          </p>

          <div className="relative mt-5 grid grid-cols-2 gap-2">
            <Kpi label={t('reports.opening')} value={data?.opening_receivable} />
            <Kpi label={t('reports.charged')} value={data?.charged} tone="text-debt" />
            <Kpi label={t('reports.paid')} value={data?.paid} tone="text-credit" />
            <Kpi
              label={t('reports.discountsRefunds')}
              value={data ? data.discounted + data.refunded : undefined}
              tone="text-info"
            />
          </div>
        </motion.div>

        {data && data.by_account.length > 0 && (
          <>
            <SectionTitle>{t('reports.byAccount')}</SectionTitle>
            <Card className="p-4">
              <Breakdown rows={data.by_account} total={data.paid} />
            </Card>
          </>
        )}
        {data && data.by_method.length > 0 && (
          <>
            <SectionTitle>{t('reports.byMethod')}</SectionTitle>
            <Card className="p-4">
              <Breakdown rows={data.by_method} total={data.paid} />
            </Card>
          </>
        )}

        <SectionTitle
          action={
            <Segmented
              value={view}
              onChange={setView}
              className="w-44"
              options={[
                { value: 'debtors', label: t('reports.debtors') },
                { value: 'all', label: t('common.all') },
              ]}
            />
          }
        >
          {t('reports.statement')}
        </SectionTitle>
        {!data ? (
          <Skeleton className="h-60" />
        ) : rows.length === 0 ? (
          <Card>
            <Empty icon={<Users className="size-7" />} title={t('reports.emptyMonth')} />
          </Card>
        ) : (
          <motion.div
            variants={listVariants}
            initial="hidden"
            animate="show"
            className="space-y-2"
            key={`${month.jy}-${month.jm}-${view}`}
          >
            {rows.map((r) => (
              <StatementCard key={r.id} row={r} />
            ))}
          </motion.div>
        )}

        {data && data.cheques_due.length > 0 && (
          <>
            <SectionTitle>{t('reports.chequesDue')}</SectionTitle>
            <Card className="p-1.5">
              <motion.div variants={listVariants} initial="hidden" animate="show">
                {data.cheques_due.map((tx) => (
                  <TxRow key={tx.id} tx={tx} showPatient />
                ))}
              </motion.div>
            </Card>
          </>
        )}

        <Button
          variant="secondary"
          className="mt-4 w-full"
          onClick={() => download(`/reports/monthly.xlsx${qs({ year: month.jy, month: month.jm })}`)}
        >
          <FileSpreadsheet className="size-5 text-credit" /> {t('reports.download')}
          <Download className="size-4 text-ink-3" />
        </Button>
      </div>
    </div>
  )
}
