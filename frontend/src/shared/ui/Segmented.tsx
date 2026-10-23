import { motion } from 'motion/react'
import { useId, type ReactNode } from 'react'
import { cx } from '@/shared/lib/cx'
import { spring } from './motion'

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  className,
}: {
  value: T
  options: { value: T; label: ReactNode; tone?: string }[]
  onChange: (v: T) => void
  className?: string
}) {
  const id = useId()
  return (
    <div className={cx('flex rounded-2xl border border-line bg-surface-2/70 p-1', className)} role="tablist">
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={cx(
              'relative flex-1 rounded-xl px-2 py-2 text-[13px] font-semibold transition-colors',
              active ? 'text-ink' : 'text-ink-3',
            )}
          >
            {active && (
              <motion.span
                layoutId={`seg-${id}`}
                transition={spring}
                className={cx('absolute inset-0 rounded-xl bg-surface shadow-sm ring-1 ring-line', o.tone)}
              />
            )}
            <span className="relative">{o.label}</span>
          </button>
        )
      })}
    </div>
  )
}
