import { motion } from 'motion/react'
import { Wallet } from 'lucide-react'
import type { Dashboard } from '@/shared/api/types'
import { faDigits } from '@/shared/lib/format'
import { t } from '@/shared/lib/i18n'
import { AnimatedMoney, CompactMoney } from '@/shared/ui'

/** What patients owe right now, with today's and this month's receipts. */
export function ReceivableHero({ data }: { data: Dashboard | undefined }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 24 }}
      className="relative overflow-hidden rounded-[30px] p-5 text-white shadow-[0_24px_60px_-20px] shadow-brand/70 bg-brand-gradient"
    >
      <div className="pointer-events-none absolute -top-24 -left-16 size-64 rounded-full bg-white/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-10 -bottom-24 size-64 rounded-full bg-black/25 blur-3xl" />
      <div className="relative">
        <div className="flex items-center gap-2 text-sm text-white/80">
          <Wallet className="size-4" /> {t('home.receivable')}
        </div>
        {!data ? (
          <div className="mt-3 h-11 w-56 rounded-xl bg-white/20" />
        ) : (
          <AnimatedMoney value={data.receivable} className="mt-2 leading-tight font-black tracking-tight" />
        )}
        <div className="mt-4 grid grid-cols-3 gap-2">
          <HeroStat label={t('home.receivedToday')} value={data?.received_today} />
          <HeroStat
            label={t('home.receivedInMonth', { month: data?.month.label.split(' ')[0] ?? t('common.month') })}
            value={data?.received_this_month}
          />
          <div className="rounded-2xl bg-white/15 p-2.5 backdrop-blur">
            <p className="text-[10.5px] text-white/75">{t('home.debtors')}</p>
            <p className="mt-0.5 text-lg font-extrabold">{data ? faDigits(data.debtors_count) : '—'}</p>
          </div>
        </div>
      </div>
    </motion.div>
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
