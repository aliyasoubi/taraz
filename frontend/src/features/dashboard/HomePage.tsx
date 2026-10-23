import { motion } from 'motion/react'
import { ArrowUpLeft, Eye, EyeOff, Settings, TrendingUp, Users } from 'lucide-react'
import { Link } from 'react-router'
import {
  Avatar,
  BarChart,
  Card,
  Empty,
  IconButton,
  itemVariants,
  listVariants,
  Money,
  SectionTitle,
  Skeleton,
} from '@/shared/ui'
import { TxRow } from '@/features/transactions/components/TxRow'
import { faDigits } from '@/shared/lib/format'
import { daysBetween, formatJ, relativeDay, todayIso, weekdayName } from '@/shared/lib/jalali'
import { useDashboard } from '@/features/dashboard/api'
import { ChequesBanner } from './components/ChequesBanner'
import { ReceivableHero } from './components/ReceivableHero'
import { setPref, usePrefs } from '@/shared/lib/settings'
import { t } from '@/shared/lib/i18n'

function Greeting() {
  const h = Number(
    new Intl.DateTimeFormat('en-US', { hour: 'numeric', hour12: false, timeZone: 'Asia/Tehran' }).format(new Date()),
  )
  return <>{t(h < 12 ? 'home.morning' : h < 17 ? 'home.day' : 'home.evening')}</>
}

export function HomePage() {
  const { data } = useDashboard()
  const { hideAmounts } = usePrefs()
  const today = todayIso()

  return (
    <div>
      <header className="flex items-center justify-between px-5 pt-safe pb-3">
        <div className="pt-3">
          <p className="text-[13px] text-ink-3">
            {t('home.dateLine', { weekday: weekdayName(today), date: formatJ(today) })}
          </p>
          <h1 className="text-2xl font-extrabold">
            <Greeting />
          </h1>
        </div>
        <div className="flex gap-2 pt-3">
          <IconButton onClick={() => setPref('hideAmounts', !hideAmounts)} aria-label={t('home.toggleAmounts')}>
            {hideAmounts ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
          </IconButton>
          <Link to="/settings">
            <IconButton aria-label={t('home.settings')}>
              <Settings className="size-5" />
            </IconButton>
          </Link>
        </div>
      </header>

      <div className="px-4">
        <ReceivableHero data={data} />

        {data && data.credit > 0 && (
          <p className="mt-2 px-2 text-[12px] text-ink-3">
            {t('home.credit')} <Money value={data.credit} tone="credit" className="font-semibold" />
          </p>
        )}

        {data && <ChequesBanner data={data} />}

        <SectionTitle
          action={
            <Link to="/reports" className="flex items-center gap-1 text-[13px] font-semibold text-brand">
              {t('home.monthlyReport')} <ArrowUpLeft className="size-4" />
            </Link>
          }
        >
          {t('home.trend')}
        </SectionTitle>
        <Card className="p-4">{data ? <BarChart series={data.series} /> : <Skeleton className="h-44" />}</Card>

        <SectionTitle
          action={
            <Link to="/patients" className="text-[13px] font-semibold text-brand">
              {t('common.all')}
            </Link>
          }
        >
          {t('home.topDebtors')}
        </SectionTitle>
        <Card className="p-2">
          {!data ? (
            <div className="space-y-2 p-2">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : data.top_debtors.length === 0 ? (
            <Empty icon={<Users className="size-7" />} title={t('home.noDebtors')} hint={t('home.allSettled')} />
          ) : (
            <motion.div variants={listVariants} initial="hidden" animate="show">
              {data.top_debtors.map((d, i) => (
                <motion.div key={d.id} variants={itemVariants}>
                  <Link
                    to={`/patients/${d.id}`}
                    className="flex items-center gap-3 rounded-2xl px-2 py-2.5 active:bg-surface-2/70"
                  >
                    <span className="w-4 text-center text-xs font-bold text-ink-3">{faDigits(i + 1)}</span>
                    <Avatar name={d.name} size={38} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{d.name}</p>
                      {d.last_activity && (
                        <p className="text-[11px] text-ink-3">
                          {t('home.lastActivity', {
                            when:
                              daysBetween(d.last_activity, today) > 30
                                ? formatJ(d.last_activity, 'short')
                                : relativeDay(d.last_activity),
                          })}
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

        <SectionTitle>{t('home.recent')}</SectionTitle>
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
              title={t('common.noTransactionsYet')}
              hint={t('home.emptyHint')}
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
