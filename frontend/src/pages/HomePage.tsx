import { motion } from 'motion/react'
import { ArrowUpLeft, CalendarClock, ChevronLeft, Eye, EyeOff, Settings, TrendingUp, Users, Wallet } from 'lucide-react'
import { Link } from 'react-router'
import { Avatar } from '@/components/Avatar'
import { BarChart } from '@/components/BarChart'
import { AnimatedMoney, CompactMoney, Money } from '@/components/Money'
import { TxRow } from '@/components/TxRow'
import { Card, Empty, IconButton, itemVariants, listVariants, SectionTitle, Skeleton } from '@/components/ui'
import { faDigits } from '@/lib/format'
import { daysBetween, formatJ, relativeDay, todayIso, weekdayName } from '@/lib/jalali'
import { useDashboard } from '@/lib/queries'
import { setPref, usePrefs } from '@/lib/settings'

function Greeting() {
  const h = Number(new Intl.DateTimeFormat('en-US', { hour: 'numeric', hour12: false, timeZone: 'Asia/Tehran' }).format(new Date()))
  return <>{h < 12 ? 'صبح بخیر' : h < 17 ? 'روز بخیر' : 'عصر بخیر'}</>
}

export function HomePage() {
  const { data, isLoading } = useDashboard()
  const { hideAmounts } = usePrefs()
  const today = todayIso()

  return (
    <div>
      <header className="flex items-center justify-between px-5 pb-3 pt-safe">
        <div className="pt-3">
          <p className="text-[13px] text-ink-3">
            {weekdayName(today)}، {formatJ(today)}
          </p>
          <h1 className="text-2xl font-extrabold">
            <Greeting />
          </h1>
        </div>
        <div className="flex gap-2 pt-3">
          <IconButton onClick={() => setPref('hideAmounts', !hideAmounts)} aria-label="نمایش/پنهان کردن مبالغ">
            {hideAmounts ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
          </IconButton>
          <Link to="/settings">
            <IconButton aria-label="تنظیمات">
              <Settings className="size-5" />
            </IconButton>
          </Link>
        </div>
      </header>

      <div className="px-4">
        {/* Hero: what is owed right now */}
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 24 }}
          className="relative overflow-hidden rounded-[30px] bg-brand-gradient p-5 text-white shadow-[0_24px_60px_-20px] shadow-brand/70"
        >
          <div className="pointer-events-none absolute -left-16 -top-24 size-64 rounded-full bg-white/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -right-10 size-64 rounded-full bg-black/25 blur-3xl" />
          <div className="relative">
            <div className="flex items-center gap-2 text-sm text-white/80">
              <Wallet className="size-4" /> کل طلب از بیماران
            </div>
            {isLoading || !data ? (
              <div className="mt-3 h-11 w-56 rounded-xl bg-white/20" />
            ) : (
              <AnimatedMoney value={data.receivable} className="mt-2 font-black leading-tight tracking-tight" />
            )}
            <div className="mt-4 grid grid-cols-3 gap-2">
              <HeroStat label="دریافتی امروز" value={data?.received_today} />
              <HeroStat label={`دریافتی ${data?.month.label.split(' ')[0] ?? 'ماه'}`} value={data?.received_this_month} />
              <div className="rounded-2xl bg-white/15 p-2.5 backdrop-blur">
                <p className="text-[10.5px] text-white/75">بدهکاران</p>
                <p className="mt-0.5 text-lg font-extrabold">{data ? faDigits(data.debtors_count) : '—'}</p>
              </div>
            </div>
          </div>
        </motion.div>

        {data && data.credit > 0 && (
          <p className="mt-2 px-2 text-[12px] text-ink-3">
            پیش‌پرداخت (بستانکاری) بیماران: <Money value={data.credit} tone="credit" className="font-semibold" />
          </p>
        )}

        {/* Cheques in hand */}
        {data && data.pending_cheques_count > 0 && (
          <Link to="/cheques">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mt-4 flex items-center gap-3 rounded-3xl border border-warn/25 bg-warn/8 p-4"
            >
              <div className="grid size-11 place-items-center rounded-2xl bg-warn/15 text-warn">
                <CalendarClock className="size-5" />
              </div>
              <div className="flex-1">
                <p className="font-semibold">{faDigits(data.pending_cheques_count)} چک در جریان</p>
                <p className="text-xs text-ink-3">
                  {data.upcoming_cheques[0]?.cheque_due_on
                    ? `نزدیک‌ترین سررسید: ${relativeDay(data.upcoming_cheques[0].cheque_due_on)}`
                    : 'هنوز وصول نشده'}
                </p>
              </div>
              <CompactMoney value={data.pending_cheques_total} className="text-sm font-bold text-warn" />
              <ChevronLeft className="size-5 text-ink-3" />
            </motion.div>
          </Link>
        )}

        <SectionTitle
          action={
            <Link to="/reports" className="flex items-center gap-1 text-[13px] font-semibold text-brand">
              گزارش ماهانه <ArrowUpLeft className="size-4" />
            </Link>
          }
        >
          روند دریافتی‌ها
        </SectionTitle>
        <Card className="p-4">{data ? <BarChart series={data.series} /> : <Skeleton className="h-44" />}</Card>

        <SectionTitle
          action={
            <Link to="/patients" className="text-[13px] font-semibold text-brand">
              همه
            </Link>
          }
        >
          بیشترین بدهی
        </SectionTitle>
        <Card className="p-2">
          {!data ? (
            <div className="space-y-2 p-2">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : data.top_debtors.length === 0 ? (
            <Empty icon={<Users className="size-7" />} title="بدهکاری وجود ندارد" hint="همه حساب‌ها تسویه است" />
          ) : (
            <motion.div variants={listVariants} initial="hidden" animate="show">
              {data.top_debtors.map((d, i) => (
                <motion.div key={d.id} variants={itemVariants}>
                  <Link to={`/patients/${d.id}`} className="flex items-center gap-3 rounded-2xl px-2 py-2.5 active:bg-surface-2/70">
                    <span className="w-4 text-center text-xs font-bold text-ink-3">{faDigits(i + 1)}</span>
                    <Avatar name={d.name} size={38} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{d.name}</p>
                      {d.last_activity && (
                        <p className="text-[11px] text-ink-3">
                          آخرین فعالیت {daysBetween(d.last_activity, today) > 30 ? formatJ(d.last_activity, 'short') : relativeDay(d.last_activity)}
                        </p>
                      )}
                    </div>
                    <Money value={d.balance} tone="debt" className="text-[15px] font-bold" />
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          )}
        </Card>

        <SectionTitle>آخرین تراکنش‌ها</SectionTitle>
        <Card className="p-1.5">
          {!data ? (
            <div className="space-y-2 p-2">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-14" />
              ))}
            </div>
          ) : data.recent.length === 0 ? (
            <Empty
              icon={<TrendingUp className="size-7" />}
              title="هنوز تراکنشی ثبت نشده"
              hint="با دکمه + پایین صفحه اولین پرداخت یا هزینه را ثبت کنید"
            />
          ) : (
            <motion.div variants={listVariants} initial="hidden" animate="show">
              {data.recent.map((tx) => (
                <TxRow key={tx.id} tx={tx} showPatient />
              ))}
            </motion.div>
          )}
        </Card>
      </div>
    </div>
  )
}

function HeroStat({ label, value }: { label: string; value: number | undefined }) {
  return (
    <div className="min-w-0 rounded-2xl bg-white/15 p-2.5 backdrop-blur">
      <p className="truncate text-[10.5px] text-white/75">{label}</p>
      {value === undefined ? (
        <div className="mt-1 h-5 w-14 rounded bg-white/20" />
      ) : (
        <CompactMoney value={value} className="mt-0.5 block text-[15px] font-extrabold" />
      )}
    </div>
  )
}
