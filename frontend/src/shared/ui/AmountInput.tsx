import { AnimatePresence, motion } from 'motion/react'
import { digitsOnly, faDigits, formatNumber, fromUnit, toUnit, toWords, UNIT_LABEL } from '@/shared/lib/format'
import { usePrefs } from '@/shared/lib/settings'
import { Pressable } from './Pressable'
import { cx } from '@/shared/lib/cx'
import { t } from '@/shared/lib/i18n'

const MAX_DIGITS = 14

/**
 * The amount, typed in the user's unit and stored in rials, shown large in the
 * middle as Apple Cash does. The number is spelled out underneath and a "000"
 * key sits beside it — rial amounts are long and a dropped zero is the most
 * expensive typo there is.
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
  const text = { brand: 'text-ink', debt: 'text-debt', credit: 'text-credit' }[tone]
  // Long rial amounts shrink to stay on one line.
  // Empty, it reads "Amount" in grey: a lone Persian zero is a dot at this size.
  const size = !display || display.length > 13 ? 'text-[34px]' : display.length > 10 ? 'text-[42px]' : 'text-[52px]'

  return (
    <div className="pt-3 pb-2 text-center">
      <div className="flex items-baseline justify-center gap-1.5">
        <input
          inputMode="numeric"
          enterKeyHint="done"
          autoComplete="off"
          aria-label={t('amount.label')}
          placeholder={t('amount.label')}
          autoFocus={autoFocus}
          value={display}
          onChange={(e) => set(digitsOnly(e.target.value))}
          className={cx(
            'w-full min-w-0 bg-transparent text-center leading-tight font-bold tracking-tight tabular caret-brand transition-[font-size] duration-200 outline-none placeholder:text-ink-3',
            size,
            text,
          )}
        />
      </div>
      <div className="mt-1 flex min-h-5 items-center justify-center px-6 text-[13px] leading-5 text-ink-2">
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={words || 'empty'}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
          >
            {words || t('amount.hint', { unit: UNIT_LABEL[unit] })}
          </motion.span>
        </AnimatePresence>
      </div>
      <div className="mt-3 flex justify-center gap-2">
        <Pressable
          onClick={() => raw && set(raw + '000')}
          className="h-8 rounded-full bg-fill px-4 text-[15px] font-semibold text-brand"
        >
          {faDigits('000')}
        </Pressable>
        {[1_000_000, 10_000_000].map((step) => (
          <Pressable
            key={step}
            onClick={() => set(String(Math.floor(shown) + step))}
            className="h-8 rounded-full bg-fill px-3.5 text-[14px] font-medium text-brand"
          >
            {t('amount.plusMillions', { n: formatNumber(step / 1e6) })}
          </Pressable>
        ))}
      </div>
    </div>
  )
}
