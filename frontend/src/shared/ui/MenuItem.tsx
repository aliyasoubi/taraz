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
        'flex w-full items-center gap-3 rounded-2xl border border-line bg-surface-2/60 px-4 py-3.5 text-start font-semibold',
        danger ? 'text-debt' : 'text-ink',
      )}
    >
      {icon}
      {label}
    </Pressable>
  )
}
