import type { ReactNode } from 'react'
import { cx } from '@/shared/lib/cx'
import { t } from '@/shared/lib/i18n'
import { Pressable, type PressableProps } from './Pressable'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'

export function Button({
  variant = 'primary',
  loading,
  className,
  children,
  disabled,
  ...rest
}: PressableProps & { variant?: Variant; loading?: boolean; children?: ReactNode }) {
  const styles: Record<Variant, string> = {
    primary: 'bg-brand-gradient text-white shadow-[0_8px_24px_-8px] shadow-brand/60',
    secondary: 'bg-surface-2 text-ink border border-line',
    ghost: 'text-ink-2 hover:bg-surface-2',
    danger: 'bg-debt/12 text-debt border border-debt/25',
  }
  return (
    <Pressable
      disabled={disabled || loading}
      className={cx(
        'inline-flex h-12 items-center justify-center gap-2 rounded-2xl px-5 text-[15px] font-semibold transition-opacity disabled:opacity-50',
        styles[variant],
        className,
      )}
      {...rest}
    >
      {loading ? <Spinner /> : children}
    </Pressable>
  )
}

export function IconButton({ className, ...rest }: PressableProps) {
  return (
    <Pressable
      className={cx(
        'grid size-10 place-items-center rounded-full border border-line bg-surface/70 text-ink-2 backdrop-blur',
        className,
      )}
      {...rest}
    />
  )
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={cx(
        'inline-block size-5 animate-spin rounded-full border-2 border-current border-t-transparent',
        className,
      )}
      aria-label={t('common.loading')}
    />
  )
}
