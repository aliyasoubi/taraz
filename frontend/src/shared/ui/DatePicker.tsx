import { AnimatePresence, motion } from 'motion/react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useMemo, useState } from 'react'
import { faDigits } from '@/shared/lib/format'
import {
  formatJ,
  FRIDAY,
  isoToJ,
  jToIso,
  monthLabel,
  monthLength,
  MONTHS,
  shiftMonth,
  todayIso,
  weekdayIndex,
  weekdayName,
  WEEKDAYS,
} from '@/shared/lib/jalali'
import { Chip } from './Chip'
import { Pressable } from './Pressable'
import { Sheet } from './Sheet'
import { spring } from './motion'
import { cx } from '@/shared/lib/cx'
import { t } from '@/shared/lib/i18n'

function CalendarGrid({ value, onPick }: { value: string; onPick: (iso: string) => void }) {
  const today = todayIso()
  const initial = isoToJ(value || today)
  const [view, setView] = useState({ jy: initial.jy, jm: initial.jm })
  const [dir, setDir] = useState(0)
  const [mode, setMode] = useState<'days' | 'months'>('days')

  const cells = useMemo(() => {
    const first = jToIso({ jy: view.jy, jm: view.jm, jd: 1 })
    const lead = weekdayIndex(first)
    const len = monthLength(view.jy, view.jm)
    return [
      ...Array.from({ length: lead }, () => null),
      ...Array.from({ length: len }, (_, i) => jToIso({ jy: view.jy, jm: view.jm, jd: i + 1 })),
    ]
  }, [view])

  const go = (delta: number) => {
    setDir(delta)
    setView((v) => shiftMonth(v.jy, v.jm, delta))
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <Pressable
          onClick={() => go(-1)}
          className="grid size-10 place-items-center rounded-full text-brand"
          aria-label={t('calendar.prevMonth')}
        >
          <ChevronRight className="size-5" />
        </Pressable>
        <button
          type="button"
          onClick={() => setMode((m) => (m === 'days' ? 'months' : 'days'))}
          className="rounded-full px-4 py-2 text-[17px] font-semibold text-ink"
        >
          {mode === 'days' ? monthLabel(view.jy, view.jm) : faDigits(view.jy)}
        </button>
        <Pressable
          onClick={() => go(1)}
          className="grid size-10 place-items-center rounded-full text-brand"
          aria-label={t('calendar.nextMonth')}
        >
          <ChevronLeft className="size-5" />
        </Pressable>
      </div>

      {mode === 'months' ? (
        <div className="grid grid-cols-3 gap-2">
          <div className="col-span-3 mb-1 flex items-center justify-center gap-3">
            <Chip onClick={() => setView((v) => ({ ...v, jy: v.jy - 1 }))}>{faDigits(view.jy - 1)}</Chip>
            <Chip onClick={() => setView((v) => ({ ...v, jy: v.jy + 1 }))}>{faDigits(view.jy + 1)}</Chip>
          </div>
          {MONTHS.map((name, i) => (
            <Pressable
              key={name}
              onClick={() => {
                setView((v) => ({ ...v, jm: i + 1 }))
                setMode('days')
              }}
              className={cx(
                'h-11 rounded-[10px] text-[15px] font-medium',
                view.jm === i + 1 ? 'bg-brand text-white' : 'bg-surface text-ink',
              )}
            >
              {name}
            </Pressable>
          ))}
        </div>
      ) : (
        <>
          <div className="mb-1 grid grid-cols-7 text-center text-[13px] font-semibold text-ink-3">
            {WEEKDAYS.map((w, i) => (
              <div key={w} className={cx('py-1', i === FRIDAY && 'text-debt/80')}>
                {w}
              </div>
            ))}
          </div>
          <div className="relative overflow-hidden">
            <AnimatePresence mode="popLayout" initial={false} custom={dir}>
              <motion.div
                key={`${view.jy}-${view.jm}`}
                custom={dir}
                initial={{ opacity: 0, x: dir * -40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: dir * 40 }}
                transition={spring}
                className="grid grid-cols-7 gap-y-1"
              >
                {cells.map((iso, i) =>
                  iso ? (
                    <Pressable
                      key={iso}
                      onClick={() => onPick(iso)}
                      className={cx(
                        'relative mx-auto grid size-11 place-items-center rounded-full text-[19px]',
                        iso === value
                          ? 'bg-brand font-semibold text-white'
                          : iso === today
                            ? 'font-semibold text-brand'
                            : weekdayIndex(iso) === FRIDAY
                              ? 'text-debt/80'
                              : 'text-ink',
                      )}
                    >
                      {faDigits(isoToJ(iso).jd)}
                    </Pressable>
                  ) : (
                    <span key={`e${i}`} />
                  ),
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </>
      )}
    </div>
  )
}

export function DatePickerSheet({
  open,
  value,
  onClose,
  onChange,
  title = t('calendar.pickDate'),
}: {
  open: boolean
  value: string
  onClose: () => void
  onChange: (iso: string) => void
  title?: string
}) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={title}
      subtitle={value ? `${weekdayName(value)} ${formatJ(value)}` : undefined}
    >
      <CalendarGrid
        key={open ? value : 'closed'}
        value={value}
        onPick={(iso) => {
          onChange(iso)
          onClose()
        }}
      />
      <div className="mt-4 flex justify-center gap-2">
        <Chip
          onClick={() => {
            onChange(todayIso())
            onClose()
          }}
        >
          {t('calendar.today')}
        </Chip>
      </div>
    </Sheet>
  )
}
