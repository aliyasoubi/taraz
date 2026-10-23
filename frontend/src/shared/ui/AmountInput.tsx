import { AnimatePresence, motion } from 'motion/react'
import { Delete } from 'lucide-react'
import { digitsOnly, faDigits, formatNumber, fromUnit, toUnit, toWords, UNIT_LABEL } from '@/shared/lib/format'
import { usePrefs } from '@/shared/lib/settings'
import { Pressable } from './Pressable'
import { cx } from '@/shared/lib/cx'
import { t } from '@/shared/lib/i18n'

const MAX_DIGITS = 14

/**
 * The amount, typed in the user's unit and stored in rials.
 * Big type, live grouping, the number spelled out underneath, and a "000" key —
 * rial amounts are long and a dropped zero is the most expensive typo there is.
 */
export function AmountInput({
  value,
  onChange,
  tone = 'brand',
  autoFocus,
}: {
  value: number | null
  onChange: (rial: number | null) => void
  tone?: 'brand' | 'debt' | 'credit'
  autoFocus?: boolean
}) {
  const { unit } = usePrefs()
  const shown = value ? toUnit(value, unit) : 0
  const display = shown ? formatNumber(shown) : ''
  const words = shown ? t('amount.words', { words: toWords(shown), unit: UNIT_LABEL[unit] }) : ''

  const set = (digits: string) => {
    const clean = digits.replace(/^0+/, '').slice(0, MAX_DIGITS)
    onChange(clean ? fromUnit(Number(clean), unit) : null)
  }
  const raw = shown ? String(Math.floor(shown)) : ''

  const ring = {
    brand: 'focus-within:ring-brand/25',
    debt: 'focus-within:ring-debt/25',
    credit: 'focus-within:ring-credit/25',
  }[tone]
  const text = { brand: 'text-ink', debt: 'text-debt', credit: 'text-credit' }[tone]

  return (
    <div className={cx('rounded-3xl border border-line bg-surface-2/60 p-4 ring-4 ring-transparent transition', ring)}>
      <div className="flex items-baseline justify-center gap-2">
        <input
          inputMode="numeric"
          enterKeyHint="done"
          autoComplete="off"
          aria-label={t('amount.label')}
          placeholder={faDigits(0)}
          autoFocus={autoFocus}
          value={display}
          onChange={(e) => set(digitsOnly(e.target.value))}
          className={cx(
            'w-full min-w-0 bg-transparent text-center text-[34px] font-extrabold tracking-tight tabular outline-none placeholder:text-ink-3/50',
            text,
          )}
        />
      </div>
      <div className="mt-1 flex min-h-5 items-center justify-center text-center text-[12px] leading-5 text-ink-3">
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={words || 'empty'}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
          >
            {words || t('amount.hint', { unit: UNIT_LABEL[unit] })}
          </motion.span>
        </AnimatePresence>
      </div>
      <div className="mt-3 flex justify-center gap-2">
        <Pressable
          onClick={() => raw && set(raw + '000')}
          className="h-9 rounded-full border border-line bg-surface px-4 text-sm font-bold text-ink-2"
        >
          {faDigits('000')}
        </Pressable>
        {[1_000_000, 10_000_000].map((step) => (
          <Pressable
            key={step}
            onClick={() => set(String(Math.floor(shown) + step))}
            className="h-9 rounded-full border border-line bg-surface px-3 text-[13px] font-semibold text-ink-2"
          >
            {t('amount.plusMillions', { n: formatNumber(step / 1e6) })}
          </Pressable>
        ))}
        <Pressable
          onClick={() => set(raw.slice(0, -1))}
          aria-label={t('amount.backspace')}
          className="grid size-9 place-items-center rounded-full border border-line bg-surface text-ink-3"
        >
          <Delete className="size-4 -scale-x-100" />
        </Pressable>
      </div>
    </div>
  )
}
