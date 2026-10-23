import { animate } from 'motion/react'
import { useEffect, useRef } from 'react'
import { formatCompact, formatMoney, UNIT_LABEL } from '@/shared/lib/format'
import { usePrefs } from '@/shared/lib/settings'
import { cx } from '@/shared/lib/cx'

type Tone = 'auto' | 'debt' | 'credit' | 'muted' | 'none'

function toneClass(tone: Tone, value: number): string {
  if (tone === 'debt') return 'text-debt'
  if (tone === 'credit') return 'text-credit'
  if (tone === 'muted') return 'text-ink-3'
  if (tone === 'auto') return value > 0 ? 'text-debt' : value < 0 ? 'text-credit' : 'text-ink-2'
  return ''
}

/** An amount in the user's chosen unit, with privacy masking. */
export function Money({
  value,
  tone = 'none',
  compact,
  sign,
  unit: showUnit = true,
  className,
  unitClassName,
}: {
  value: number
  tone?: Tone
  compact?: boolean
  sign?: boolean
  unit?: boolean
  className?: string
  unitClassName?: string
}) {
  const { unit, hideAmounts } = usePrefs()
  const text = hideAmounts ? '••••••' : compact ? formatCompact(value, unit) : formatMoney(value, unit, { sign })
  return (
    <span className={cx('whitespace-nowrap tabular', toneClass(tone, value), className)}>
      {text}
      {showUnit && (
        <span className={cx('ms-1 text-[0.72em] font-normal opacity-70', unitClassName)}>{UNIT_LABEL[unit]}</span>
      )}
    </span>
  )
}

/**
 * Counts up to `value` when it appears or changes — the hero numbers.
 * The type shrinks to fit its container: a rial total can run to 14 characters.
 */
export function AnimatedMoney({
  value,
  className,
  compact,
  maxSize = 40,
}: {
  value: number
  className?: string
  compact?: boolean
  maxSize?: number
}) {
  const { unit, hideAmounts } = usePrefs()
  const ref = useRef<HTMLSpanElement>(null)
  const from = useRef(0)
  const fmt = (v: number) => (compact ? formatCompact(v, unit) : formatMoney(v, unit))
  // ~0.6em per digit in Vazirmatn Black, plus room for the unit label.
  const chars = fmt(value).length
  const fontSize = `min(${maxSize}px, ${(100 / (chars * 0.6 + 2.2)).toFixed(2)}cqw)`

  // The digits are written straight to the DOM on each frame, not through React state.
  useEffect(() => {
    const node = ref.current
    if (!node) return
    const format = (v: number) => (compact ? formatCompact(v, unit) : formatMoney(v, unit))
    if (hideAmounts) {
      node.textContent = '••••••'
      return
    }
    const controls = animate(from.current, value, {
      duration: 1.1,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => {
        node.textContent = format(Math.round(v))
      },
    })
    from.current = value
    return () => controls.stop()
  }, [value, unit, hideAmounts, compact])

  return (
    <div className="@container">
      <span className={cx('block whitespace-nowrap tabular', className)} style={{ fontSize }}>
        <span ref={ref} />
        <span className="ms-1.5 text-[0.4em] font-medium opacity-70">{UNIT_LABEL[unit]}</span>
      </span>
    </div>
  )
}

/** The number large with its scale word (million, billion) small beside it — for narrow tiles. */
export function CompactMoney({ value, className }: { value: number; className?: string }) {
  const { unit, hideAmounts } = usePrefs()
  if (hideAmounts) return <span className={className}>••••</span>
  const [num, ...rest] = formatCompact(value, unit).split(' ')
  return (
    <span className={cx('whitespace-nowrap tabular', className)}>
      {num}
      {rest.length > 0 && <span className="ms-1 text-[0.7em] font-semibold opacity-80">{rest.join(' ')}</span>}
    </span>
  )
}
