import { FileSpreadsheet, Users } from 'lucide-react'
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
  Empty,
  ListIcon,
  ListRow,
  ListSection,
  Money,
  MonthSwitcher,
  PageHeader,
  Segmented,
  Skeleton,
  useMonthState,
} from '@/shared/ui'
import { Breakdown } from './components/Breakdown'
import { StatementCard } from './components/StatementCard'

/** The full month: totals, where the money went, and each patient's opening and closing balance. */
export function ReportsPage() {
  const [month, shift, dir] = useMonthState()
  const { data, isFetching } = useMonthlyReport(month.jy, month.jm)
  const [view, setView] = useState<'debtors' | 'all'>('debtors')
  const rows = (data?.rows ?? []).filter((r) => (view === 'debtors' ? r.closing > 0 : true))

  return (
    <div>
      <PageHeader back title={t('reports.title')} subtitle={t('reports.subtitle')}>
        <MonthSwitcher value={month} onShift={shift} dir={dir} />
      </PageHeader>
      <div className={cx('px-4 transition-opacity', isFetching && 'opacity-70')}>
        <div className="rounded-[12px] bg-surface px-4 pt-3.5 pb-4">
          <p className="text-[13px] text-ink-2">
            {data
              ? t('reports.receivableAt', {
                  month: data.month.label.split(' ')[0] ?? '',
                  date: formatJ(data.month.end, 'short'),
                })
              : t('reports.receivableAtMonth')}
          </p>
          {data ? (
            <>
              <AnimatedMoney
                value={data.closing_receivable}
                maxSize={34}
                className="mt-0.5 font-bold tracking-tight text-debt"
              />
              <p className="mt-0.5 text-[13px] text-ink-2">
                {t('reports.debtorsCount', { n: faDigits(data.debtors_count) })}
                {data.closing_credit > 0 && (
                  <>
                    {' · '}
                    {t('reports.prepaid')} <Money value={data.closing_credit} compact />
                  </>
                )}
              </p>
            </>
          ) : (
            <Skeleton className="mt-2 h-14" />
          )}
        </div>

        {data && (
          <ListSection className="mt-4">
            <ListRow title={t('reports.opening')} value={<Money value={data.opening_receivable} compact />} />
            <ListRow
              title={t('reports.charged')}
              value={<Money value={data.charged} compact className="text-debt" />}
            />
            <ListRow title={t('reports.paid')} value={<Money value={data.paid} compact className="text-credit" />} />
            <ListRow
              title={t('reports.discountsRefunds')}
              value={<Money value={data.discounted + data.refunded} compact className="text-info" />}
            />
          </ListSection>
        )}

        {data && data.by_account.length > 0 && (
          <ListSection header={t('reports.byAccount')}>
            <Breakdown rows={data.by_account} total={data.paid} />
          </ListSection>
        )}
        {data && data.by_method.length > 0 && (
          <ListSection header={t('reports.byMethod')}>
            <Breakdown rows={data.by_method} total={data.paid} />
          </ListSection>
        )}

        <h2 className="mt-8 mb-2 px-1 text-[20px] font-bold">{t('reports.statement')}</h2>
        <Segmented
          value={view}
          onChange={setView}
          options={[
            { value: 'debtors', label: t('reports.debtors') },
            { value: 'all', label: t('common.all') },
          ]}
        />
        {!data ? (
          <Skeleton className="mt-3 h-60" />
        ) : rows.length === 0 ? (
          <Empty icon={<Users />} title={t('reports.emptyMonth')} />
        ) : (
          <ListSection className="mt-3">
            {rows.map((r) => (
              <StatementCard key={r.id} row={r} />
            ))}
          </ListSection>
        )}

        {data && data.cheques_due.length > 0 && (
          <ListSection header={t('reports.chequesDue')}>
            {data.cheques_due.map((tx) => (
              <TxRow key={tx.id} tx={tx} showPatient />
            ))}
          </ListSection>
        )}

        <ListSection>
          <ListRow
            icon={
              <ListIcon tone="credit">
                <FileSpreadsheet />
              </ListIcon>
            }
            title={t('reports.download')}
            onClick={() => download(`/reports/monthly.xlsx${qs({ year: month.jy, month: month.jm })}`)}
          />
        </ListSection>
      </div>
    </div>
  )
}
