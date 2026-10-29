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
    neutral: 'bg-fill text-ink-2',
    debt: 'bg-debt/15 text-debt',
    credit: 'bg-credit/15 text-credit',
    warn: 'bg-warn/15 text-warn',
    info: 'bg-info/15 text-info',
  }
  return (
    <span
      className={cx(
        'inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[12px] font-medium whitespace-nowrap',
        tones[tone],
      )}
    >
      {children}
    </span>
  )
}
