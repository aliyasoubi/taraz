import type { ReactNode } from 'react'
import { cx } from '@/shared/lib/cx'

/**
 * iOS segmented control: a raised thumb slides across a grey track. The thumb is
 * placed with CSS, not a layout animation, so it moves only when the selection
 * does — never when content above it shifts the whole control.
 */
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
  const index = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  )
  const share = `(100% - 4px) / ${options.length}`
  return (
    <div className={cx('relative flex rounded-[9px] bg-fill p-0.5', className)} role="tablist">
      <span
        aria-hidden
        className={cx(
          'absolute top-0.5 bottom-0.5 rounded-[7px] bg-surface shadow-[0_3px_8px_rgb(0_0_0/0.12),0_3px_1px_rgb(0_0_0/0.04)] transition-[inset-inline-start] duration-300 ease-ios dark:bg-[#636366]',
          options[index]?.tone,
        )}
        style={{ width: `calc(${share})`, insetInlineStart: `calc(2px + ${index} * ${share})` }}
      />
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
              'relative h-7 flex-1 rounded-[7px] px-2 text-[13px] text-ink',
              active ? 'font-semibold' : 'font-medium',
            )}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
