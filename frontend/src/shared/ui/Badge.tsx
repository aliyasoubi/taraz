import type { ReactNode } from 'react'
import { cx } from '@/shared/lib/cx'

export function Badge({
  tone = 'neutral',
  children,
}: {
  tone?: 'neutral' | 'debt' | 'credit' | 'warn' | 'info'
  children: ReactNode
}) {
  const tones = {
    neutral: 'bg-surface-2 text-ink-2 border-line',
    debt: 'bg-debt/12 text-debt border-debt/20',
    credit: 'bg-credit/12 text-credit border-credit/20',
    warn: 'bg-warn/12 text-warn border-warn/25',
    info: 'bg-info/12 text-info border-info/20',
  }
  return (
    <span
      className={cx(
        'inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap',
        tones[tone],
      )}
    >
      {children}
    </span>
  )
}
