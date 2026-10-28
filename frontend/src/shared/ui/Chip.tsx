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
        'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[14px] font-medium transition-colors',
        active ? 'bg-brand text-white' : 'bg-fill text-ink',
        className,
      )}
      {...rest}
    >
      {children}
    </Pressable>
  )
}
