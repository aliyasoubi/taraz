import { motion } from 'motion/react'
import { useState } from 'react'
import { MONTHS } from '@/lib/jalali'
import type { SeriesPoint } from '@/lib/types'
import { Money } from './Money'
import { cx } from './ui'
import { t } from '@/lib/i18n'

/** Received (filled) vs charged (outline) per month. Tap a month for its figures. */
export function BarChart({ series }: { series: SeriesPoint[] }) {
  const [active, setActive] = useState(series.length - 1)
  const max = Math.max(1, ...series.flatMap((s) => [s.received, s.charged]))
  const point = series[active]

  return (
    <div>
      <div className="mb-4 flex items-end justify-between">
        <div>
          <p className="text-xs text-ink-3">{t('chart.received', { month: point ? (MONTHS[point.month - 1] ?? '') : '' })}</p>
          <Money value={point?.received ?? 0} className="text-xl font-extrabold text-ink" />
        </div>
        <div className="text-end">
          <p className="text-xs text-ink-3">{t('chart.charged')}</p>
          <Money value={point?.charged ?? 0} className="text-sm font-bold text-ink-2" />
        </div>
      </div>
      {/* RTL row: the oldest month sits on the right, as the eye starts there. */}
      <div className="flex h-32 items-end gap-2">
        {series.map((s, i) => {
          const isActive = i === active
          return (
            <button
              key={`${s.year}-${s.month}`}
              type="button"
              onClick={() => setActive(i)}
              className="flex h-full flex-1 flex-col items-center justify-end gap-1.5"
              aria-label={s.label}
            >
              <div className="relative flex h-full w-full items-end justify-center gap-1">
                <motion.div
                  className="w-2.5 rounded-full border border-ink-3/40"
                  initial={{ height: 0 }}
                  animate={{ height: `${Math.max(4, (s.charged / max) * 100)}%` }}
                  transition={{ type: 'spring', stiffness: 120, damping: 18, delay: i * 0.05 }}
                />
                <motion.div
                  className={cx('w-3.5 rounded-full', isActive ? 'bg-brand-gradient' : 'bg-brand/35')}
                  initial={{ height: 0 }}
                  animate={{ height: `${Math.max(4, (s.received / max) * 100)}%` }}
                  transition={{ type: 'spring', stiffness: 120, damping: 18, delay: i * 0.05 + 0.04 }}
                />
              </div>
              <span className={cx('whitespace-nowrap text-[9.5px] font-semibold', isActive ? 'text-ink' : 'text-ink-3')}>
                {MONTHS[s.month - 1]}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
