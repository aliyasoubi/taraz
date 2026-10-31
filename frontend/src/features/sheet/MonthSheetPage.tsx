import { Download, Plus, Table2 } from 'lucide-react'
import { useState } from 'react'
import { useAccounts } from '@/features/accounts/api'
import { TxRow } from '@/features/transactions/components/TxRow'
import { useTransactionSheets } from '@/features/transactions/TransactionSheets'
import { download, qs } from '@/shared/api/client'
import { faDigits } from '@/shared/lib/format'
import { t } from '@/shared/lib/i18n'
import { formatJ, monthLabel, weekdayName } from '@/shared/lib/jalali'
import {
  Chip,
  Empty,
  IconButton,
  ListSection,
  Money,
  MonthSwitcher,
  PageHeader,
  Skeleton,
  useMonthState,
} from '@/shared/ui'
import { useMonthSheet } from './api'
import { rowsFor, sheetDays, sheetTotals } from './sheet'

/**
 * The second tab: the month as the practice's own sheet — every row of the
 * Jalali month, newest day first, each with what the patient owed right after
 * it. Downloads as Excel in the same layout.
 */
export function MonthSheetPage() {
  const [month, shift, dir] = useMonthState()
  const [accountId, setAccountId] = useState<number | null>(null)
  const { newTransaction } = useTransactionSheets()
  const accounts = (useAccounts().data ?? []).filter((a) => !a.is_archived)
  const { data, isLoading } = useMonthSheet(month.jy, month.jm)
  const rows = rowsFor(data?.rows ?? [], accountId)
  const totals = sheetTotals(rows)
  const label = monthLabel(month.jy, month.jm)

  return (
    <div>
      <PageHeader
        title={t('sheet.title')}
        actions={
          <>
            <IconButton
              onClick={() => download(`/reports/month-sheet.xlsx${qs({ year: month.jy, month: month.jm })}`)}
              aria-label={t('sheet.download')}
            >
              <Download className="size-[22px]" />
            </IconButton>
            <IconButton onClick={() => newTransaction({ type: 'payment' })} aria-label={t('patient.addPayment')}>
              <Plus className="size-[26px]" />
            </IconButton>
          </>
        }
      >
        <MonthSwitcher value={month} onShift={shift} dir={dir} />
      </PageHeader>

      <div className="px-4">
        <div className="grid grid-cols-2 rounded-[12px] bg-surface py-3.5">
          <div className="px-4">
            <p className="text-[13px] text-ink-2">{t('sheet.received')}</p>
            {data ? (
              <Money value={totals.received} className="mt-0.5 block text-[20px] font-bold text-credit" />
            ) : (
              <Skeleton className="mt-1 h-6" />
            )}
          </div>
          <div className="border-s border-line-2 px-4">
            <p className="text-[13px] text-ink-2">{t('sheet.charged')}</p>
            {data ? (
              <Money value={totals.charged} className="mt-0.5 block text-[20px] font-bold" />
            ) : (
              <Skeleton className="mt-1 h-6" />
            )}
          </div>
        </div>
        {data && (
          <p className="mt-1.5 px-4 text-[13px] text-ink-2">
            {t('sheet.rows', { month: label, n: faDigits(rows.length) })}
          </p>
        )}

        {accounts.length > 1 && (
          <div className="-mx-4 mt-4 no-scrollbar flex gap-2 overflow-x-auto px-4">
            <Chip active={accountId === null} onClick={() => setAccountId(null)}>
              {t('sheet.allRows')}
            </Chip>
            {accounts.map((a) => (
              <Chip key={a.id} active={accountId === a.id} onClick={() => setAccountId(a.id)}>
                {a.title}
              </Chip>
            ))}
          </div>
        )}

        {isLoading ? (
          <Skeleton className="mt-6 h-72" />
        ) : rows.length === 0 ? (
          <Empty icon={<Table2 />} title={t('sheet.empty')} hint={t('sheet.emptyHint')} />
        ) : (
          sheetDays(rows).map((day) => (
            <ListSection key={day.date} header={`${weekdayName(day.date)} ${formatJ(day.date)}`}>
              {day.rows.map((r) => (
                <TxRow key={r.id} tx={r} showPatient balanceAfter={r.balance_after} />
              ))}
            </ListSection>
          ))
        )}
      </div>
    </div>
  )
}
