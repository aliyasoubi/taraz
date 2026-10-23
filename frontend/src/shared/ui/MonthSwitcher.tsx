import { ChevronLeft, ChevronRight } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { currentJMonth, monthLabel, shiftMonth } from '@/shared/lib/jalali'
import { Pressable } from './Pressable'
import { t } from '@/shared/lib/i18n'

export interface JMonthValue {
  jy: number
  jm: number
}

export function useMonthState(): [JMonthValue, (delta: number) => void, number] {
  const [m, setM] = useState(currentJMonth)
  const [dir, setDir] = useState(0)
  return [
    m,
    (delta: number) => {
      setDir(delta)
      setM((v) => shiftMonth(v.jy, v.jm, delta))
    },
    dir,
  ]
}

export function MonthSwitcher({
  value,
  onShift,
  dir,
}: {
  value: JMonthValue
  onShift: (d: number) => void
  dir: number
}) {
  const now = currentJMonth()
  const isCurrent = value.jy === now.jy && value.jm === now.jm
  return (
    <div className="flex items-center justify-between rounded-3xl border border-line bg-surface/70 p-1.5 backdrop-blur">
      <Pressable
        onClick={() => onShift(-1)}
        className="grid size-11 place-items-center rounded-2xl bg-surface-2"
        aria-label={t('calendar.prevMonth')}
      >
        <ChevronRight className="size-5" />
      </Pressable>
      <div className="relative h-11 flex-1 overflow-hidden">
        <AnimatePresence initial={false} custom={dir} mode="popLayout">
          <motion.div
            key={`${value.jy}-${value.jm}`}
            initial={{ opacity: 0, x: dir * -50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: dir * 50 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            className="absolute inset-0 flex flex-col items-center justify-center"
          >
            <span className="text-base font-extrabold">{monthLabel(value.jy, value.jm)}</span>
            {isCurrent && <span className="text-[10px] font-semibold text-brand">{t('calendar.currentMonth')}</span>}
          </motion.div>
        </AnimatePresence>
      </div>
      <Pressable
        onClick={() => onShift(1)}
        disabled={isCurrent}
        className="grid size-11 place-items-center rounded-2xl bg-surface-2 disabled:opacity-30"
        aria-label={t('calendar.nextMonth')}
      >
        <ChevronLeft className="size-5" />
      </Pressable>
    </div>
  )
}
