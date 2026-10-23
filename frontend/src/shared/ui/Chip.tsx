import type { ReactNode } from 'react'
import { cx } from '@/shared/lib/cx'
import { Pressable, type PressableProps } from './Pressable'

export function Chip({
  active,
  className,
  children,
  ...rest
}: PressableProps & { active?: boolean; children?: ReactNode }) {
  return (
    <Pressable
      className={cx(
        'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-medium transition-colors',
        active ? 'border-brand/50 bg-brand/15 text-ink' : 'border-line bg-surface-2/70 text-ink-2',
        className,
      )}
      {...rest}
    >
      {children}
    </Pressable>
  )
}
