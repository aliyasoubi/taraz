import { motion } from 'motion/react'
import { useId, type ReactNode } from 'react'
import { cx } from '@/shared/lib/cx'
import { spring } from './motion'

/** iOS segmented control: a raised thumb slides across a grey track. */
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
    <div className={cx('flex rounded-[9px] bg-fill p-0.5', className)} role="tablist">
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
              'relative h-7 flex-1 rounded-[7px] px-2 text-[13px] transition-[font-weight]',
              active ? 'font-semibold text-ink' : 'font-medium text-ink',
            )}
          >
            {active && (
              <motion.span
                layoutId={`seg-${id}`}
                transition={spring}
                className={cx(
                  'absolute inset-0 rounded-[7px] bg-surface shadow-[0_3px_8px_rgb(0_0_0/0.12),0_3px_1px_rgb(0_0_0/0.04)] dark:bg-[#636366]',
                  o.tone,
                )}
              />
            )}
            <span className="relative">{o.label}</span>
          </button>
        )
      })}
    </div>
  )
}
