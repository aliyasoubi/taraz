import { AnimatePresence, motion } from 'motion/react'
import { ChevronDown, Download, FileSpreadsheet, Users } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { Avatar } from '@/components/Avatar'
import { AnimatedMoney, Money } from '@/components/Money'
import { MonthSwitcher, useMonthState } from '@/components/MonthSwitcher'
import { PageHeader } from '@/components/PageHeader'
import { TxRow } from '@/components/TxRow'
import { Button, Card, cx, Empty, itemVariants, listVariants, Segmented, SectionTitle, Skeleton } from '@/components/ui'
import { download, qs } from '@/lib/api'
import { faDigits } from '@/lib/format'
import { formatJ } from '@/lib/jalali'
import { accountAccent } from '@/lib/labels'
import { useMonthlyReport } from '@/lib/queries'
import type { BreakdownRow, StatementRow } from '@/lib/types'

export function ReportsPage() {
  const [month, shift, dir] = useMonthState()
  const { data, isFetching } = useMonthlyReport(month.jy, month.jm)
  const [view, setView] = useState<'debtors' | 'all'>('debtors')
  const rows = (data?.rows ?? []).filter((r) => (view === 'debtors' ? r.closing > 0 : true))

  return (
    <div>
      <PageHeader title="گزارش ماهانه" subtitle="مانده هر بیمار در پایان ماه" />
      <div className="space-y-4 px-4">
        <MonthSwitcher value={month} onShift={shift} dir={dir} />

        <motion.div
          className={cx('relative overflow-hidden rounded-[30px] border border-line bg-surface/80 p-5 transition-opacity', isFetching && 'opacity-70')}
        >
          <div className="pointer-events-none absolute -left-20 -top-20 size-56 rounded-full bg-debt/20 blur-3xl" />
          <p className="relative text-[13px] text-ink-3">
            طلب در پایان {data ? `${data.month.label.split(' ')[0]} (${formatJ(data.month.end, 'short')})` : 'ماه'}
          </p>
          {data ? (
            <AnimatedMoney value={data.closing_receivable} maxSize={36} className="relative font-black tracking-tight text-debt" />
          ) : (
            <Skeleton className="mt-2 h-10 w-48" />
          )}
          <p className="relative mt-1 text-[12px] text-ink-3">
            {data ? `${faDigits(data.debtors_count)} بیمار بدهکار` : ''}
            {data && data.closing_credit > 0 && (
              <>
                {' · '}پیش‌پرداخت <Money value={data.closing_credit} tone="credit" compact />
              </>
            )}
          </p>

          <div className="relative mt-5 grid grid-cols-2 gap-2">
            <Kpi label="مانده ابتدای ماه" value={data?.opening_receivable} />
            <Kpi label="هزینه‌های ماه" value={data?.charged} tone="text-debt" />
            <Kpi label="دریافتی ماه" value={data?.paid} tone="text-credit" />
            <Kpi label="تخفیف / استرداد" value={data ? data.discounted + data.refunded : undefined} tone="text-info" />
          </div>
        </motion.div>

        {data && data.by_account.length > 0 && (
          <>
            <SectionTitle>دریافتی به تفکیک حساب مقصد</SectionTitle>
            <Card className="p-4">
              <Breakdown rows={data.by_account} total={data.paid} />
            </Card>
          </>
        )}
        {data && data.by_method.length > 0 && (
          <>
            <SectionTitle>روش پرداخت</SectionTitle>
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
                { value: 'debtors', label: 'بدهکاران' },
                { value: 'all', label: 'همه' },
              ]}
            />
          }
        >
          صورت‌حساب بیماران
        </SectionTitle>
        {!data ? (
          <Skeleton className="h-60" />
        ) : rows.length === 0 ? (
          <Card>
            <Empty icon={<Users className="size-7" />} title="موردی برای این ماه نیست" />
          </Card>
        ) : (
          <motion.div variants={listVariants} initial="hidden" animate="show" className="space-y-2" key={`${month.jy}-${month.jm}-${view}`}>
            {rows.map((r) => (
              <StatementCard key={r.id} row={r} />
            ))}
          </motion.div>
        )}

        {data && data.cheques_due.length > 0 && (
          <>
            <SectionTitle>چک‌های سررسید این ماه</SectionTitle>
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
          <FileSpreadsheet className="size-5 text-credit" /> دریافت فایل اکسل این ماه
          <Download className="size-4 text-ink-3" />
        </Button>
      </div>
    </div>
  )
}

function Kpi({ label, value, tone }: { label: string; value: number | undefined; tone?: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface-2/60 px-3 py-2.5">
      <p className="text-[11px] text-ink-3">{label}</p>
      {value === undefined ? (
        <Skeleton className="mt-1 h-5 w-20" />
      ) : (
        <Money value={value} compact className={cx('mt-0.5 block text-[15px] font-bold', tone)} />
      )}
    </div>
  )
}

function Breakdown({ rows, total }: { rows: BreakdownRow[]; total: number }) {
  return (
    <div className="space-y-3.5">
      {rows.map((r, i) => {
        const pct = total > 0 ? r.amount / total : 0
        return (
          <div key={r.key}>
            <div className="mb-1.5 flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 font-semibold">
                <span className="size-2.5 rounded-full" style={{ background: r.color ? accountAccent(r.color) : 'var(--ink-3)' }} />
                {r.label}
                <span className="text-[11px] font-normal text-ink-3">{faDigits(r.count)} مورد</span>
              </span>
              <Money value={r.amount} compact className="font-bold" />
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-line">
              <motion.div
                className="h-full rounded-full"
                style={{ background: r.color ? accountAccent(r.color) : 'var(--brand)' }}
                initial={{ width: 0 }}
                animate={{ width: `${Math.max(2, pct * 100)}%` }}
                transition={{ type: 'spring', stiffness: 90, damping: 20, delay: i * 0.05 }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function StatementCard({ row }: { row: StatementRow }) {
  const [open, setOpen] = useState(false)
  return (
    <motion.div variants={itemVariants} layout className="overflow-hidden rounded-3xl border border-line bg-surface/70">
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-3 p-3 text-start">
        <Avatar name={row.name} size={40} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{row.name}</p>
          <p className="text-[11px] text-ink-3">
            ابتدای ماه <Money value={row.opening} unit={false} />
          </p>
        </div>
        <div className="text-end">
          <Money value={row.closing} tone="auto" className="font-bold" unit={false} />
          <p className="text-[10px] text-ink-3">پایان ماه</p>
        </div>
        <ChevronDown className={cx('size-4 text-ink-3 transition-transform', open && 'rotate-180')} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-2 gap-2 border-t border-line p-3 text-[13px]">
              <Line label="هزینه" value={row.charged} tone="text-debt" />
              <Line label="پرداخت" value={row.paid} tone="text-credit" />
              <Line label="تخفیف" value={row.discounted} />
              <Line label="استرداد" value={row.refunded} />
              {row.pending_cheques > 0 && <Line label="چک در جریان" value={row.pending_cheques} tone="text-warn" />}
              <Link to={`/patients/${row.id}`} className="col-span-2 mt-1 rounded-xl bg-surface-2 py-2 text-center font-semibold text-brand">
                مشاهده گردش حساب
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function Line({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-surface-2/60 px-3 py-2">
      <span className="text-ink-3">{label}</span>
      <Money value={value} unit={false} className={cx('font-semibold', tone)} />
    </div>
  )
}
