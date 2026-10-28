import type { ReactNode } from 'react'
import { cx } from '@/shared/lib/cx'
import { t } from '@/shared/lib/i18n'
import { Pressable, type PressableProps } from './Pressable'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'

/** iOS button styles: filled, tinted (secondary), plain (ghost) and destructive. */
export function Button({
  variant = 'primary',
  loading,
  className,
  children,
  disabled,
  ...rest
}: PressableProps & { variant?: Variant; loading?: boolean; children?: ReactNode }) {
  const styles: Record<Variant, string> = {
    primary: 'bg-brand text-white',
    secondary: 'bg-brand/15 text-brand',
    ghost: 'text-brand',
    danger: 'bg-debt/15 text-debt',
  }
  return (
    <Pressable
      disabled={disabled || loading}
      className={cx(
        'inline-flex h-[50px] items-center justify-center gap-2 rounded-[12px] px-5 text-[17px] font-semibold disabled:opacity-40',
        styles[variant],
        className,
      )}
      {...rest}
    >
      {loading ? <Spinner /> : children}
    </Pressable>
  )
}

/** A bar button: the bare glyph in the tint colour, with a full 44pt touch target. */
export function IconButton({ className, ...rest }: PressableProps) {
  return <Pressable className={cx('grid size-10 place-items-center rounded-full text-brand', className)} {...rest} />
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={cx(
        'inline-block size-5 animate-spin rounded-full border-2 border-current border-t-transparent opacity-70',
        className,
      )}
      aria-label={t('common.loading')}
    />
  )
}
