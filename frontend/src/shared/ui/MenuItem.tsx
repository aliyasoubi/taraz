import type { ReactNode } from 'react'
import { cx } from '@/shared/lib/cx'
import { Pressable } from './Pressable'

/** A full-width action row in an options sheet. */
export function MenuItem({
  icon,
  label,
  onClick,
  danger,
}: {
  icon: ReactNode
  label: string
  onClick: () => void
  danger?: boolean
}) {
  return (
    <Pressable
      onClick={onClick}
      className={cx(
        'flex h-[52px] w-full items-center gap-3 rounded-[12px] bg-surface px-4 text-start [&>svg]:shrink-0',
        danger ? 'text-debt' : 'text-ink [&>svg]:text-brand',
      )}
    >
      {icon}
      {label}
    </Pressable>
  )
}
