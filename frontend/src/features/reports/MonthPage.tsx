import { CalendarDays, FileSpreadsheet } from 'lucide-react'
import { useMonthlyReport } from '@/features/reports/api'
import { download, qs } from '@/shared/api/client'
import { faDigits } from '@/shared/lib/format'
import { t } from '@/shared/lib/i18n'
import { monthLabel } from '@/shared/lib/jalali'
import {
  AnimatedMoney,
  Avatar,
  Empty,
  ListIcon,
  ListRow,
  ListSection,
  Money,
  MonthSwitcher,
  PageHeader,
  Skeleton,
  useMonthState,
} from '@/shared/ui'

/** The third tab: what each patient owed when a month closed, and the Excel file for it. */
export function MonthPage() {
  const [month, shift, dir] = useMonthState()
  const { data } = useMonthlyReport(month.jy, month.jm)
  const label = monthLabel(month.jy, month.jm)
  const debtors = (data?.rows ?? []).filter((r) => r.closing > 0).sort((a, b) => b.closing - a.closing)

  return (
    <div>
      <PageHeader title={t('month.title')}>
        <MonthSwitcher value={month} onShift={shift} dir={dir} />
      </PageHeader>

      <div className="px-4">
        <div className="rounded-[12px] bg-surface px-4 pt-3.5 pb-4">
          <p className="text-[13px] text-ink-2">{t('month.receivable', { month: label })}</p>
          {data ? (
            <>
              <AnimatedMoney
                value={data.closing_receivable}
                maxSize={34}
                className="mt-0.5 font-bold tracking-tight text-debt"
              />
              <p className="mt-0.5 text-[13px] text-ink-2">
                {t('reports.debtorsCount', { n: faDigits(data.debtors_count) })}
              </p>
            </>
          ) : (
            <Skeleton className="mt-2 h-14" />
          )}
        </div>

        <ListSection className="mt-4">
          <ListRow
            icon={
              <ListIcon tone="credit">
                <FileSpreadsheet />
              </ListIcon>
            }
            title={t('month.download')}
            onClick={() => download(`/reports/monthly.xlsx${qs({ year: month.jy, month: month.jm })}`)}
          />
        </ListSection>

        {!data ? (
          <Skeleton className="mt-8 h-72" />
        ) : debtors.length === 0 ? (
          <Empty icon={<CalendarDays />} title={t('reports.emptyMonth')} />
        ) : (
          <ListSection header={t('month.debtors')}>
            {debtors.map((r) => (
              <ListRow
                key={r.id}
                to={`/patients/${r.id}`}
                icon={<Avatar name={r.name} size={32} />}
                title={r.name}
                subtitle={
                  r.pending_cheques > 0 ? <span className="text-warn">{t('common.pendingCheque')}</span> : undefined
                }
                value={<Money value={r.closing} tone="debt" unit={false} />}
                chevron
              />
            ))}
          </ListSection>
        )}
      </div>
    </div>
  )
}
