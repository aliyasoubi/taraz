import { Check, ChevronLeft } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { cx } from '@/shared/lib/cx'

/** An inset grouped section, as in Settings: a header, rounded rows, a footnote. */
export function ListSection({
  header,
  footer,
  children,
  className,
}: {
  header?: ReactNode
  footer?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={cx('mt-8 first:mt-2', className)}>
      {header && <div className="mb-1.5 flex items-end justify-between px-4 text-[13px] text-ink-2">{header}</div>}
      <div className="overflow-hidden rounded-[12px] bg-surface">{children}</div>
      {footer && <div className="mt-1.5 px-4 text-[13px] leading-5 text-ink-2">{footer}</div>}
    </section>
  )
}

const ICON_TONE = {
  brand: 'bg-brand',
  debt: 'bg-debt',
  credit: 'bg-credit',
  warn: 'bg-warn',
  info: 'bg-info',
  gray: 'bg-ink-3',
} as const

/** The rounded, coloured square that heads a Settings row. */
export function ListIcon({ tone = 'brand', children }: { tone?: keyof typeof ICON_TONE; children: ReactNode }) {
  return (
    <span
      className={cx(
        'grid size-[29px] place-items-center rounded-[7px] text-white [&>svg]:size-[18px]',
        ICON_TONE[tone],
      )}
    >
      {children}
    </span>
  )
}

/**
 * One row of a grouped list. The hairline between rows starts where the text
 * does, past the icon, as on iOS. A row with `to` navigates, with `onClick` acts.
 */
export function ListRow({
  icon,
  title,
  subtitle,
  value,
  chevron,
  checked,
  destructive,
  to,
  onClick,
  className,
  children,
}: {
  icon?: ReactNode
  title?: ReactNode
  subtitle?: ReactNode
  value?: ReactNode
  chevron?: boolean
  checked?: boolean
  destructive?: boolean
  to?: string
  onClick?: () => void
  className?: string
  /** Replaces the title block, e.g. with an input. */
  children?: ReactNode
}) {
  const interactive = Boolean(to || onClick)
  const body = (
    <>
      {icon && <span className="shrink-0">{icon}</span>}
      <span className="relative flex min-h-11 min-w-0 flex-1 items-center gap-2 py-2.5 pe-4 after:absolute after:inset-x-0 after:bottom-0 after:h-px after:origin-bottom after:scale-y-50 after:bg-line-2 group-last:after:hidden">
        {children ?? (
          <span className="min-w-0 flex-1">
            <span className={cx('block truncate text-[17px] leading-[22px]', destructive && 'text-debt')}>{title}</span>
            {subtitle && (
              <span className="mt-0.5 block truncate text-[13px] leading-[18px] text-ink-2">{subtitle}</span>
            )}
          </span>
        )}
        {value !== undefined && <span className="shrink-0 text-[17px] text-ink-2">{value}</span>}
        {checked && <Check className="size-5 shrink-0 text-brand" strokeWidth={2.6} />}
        {chevron && <ChevronLeft className="size-5 shrink-0 text-ink-3" strokeWidth={2.4} />}
      </span>
    </>
  )
  const rowClass = cx(
    'group flex w-full items-center gap-3 ps-4 text-start',
    interactive && 'transition-colors duration-300 active:bg-highlight active:duration-0',
    className,
  )
  if (to)
    return (
      <Link to={to} className={rowClass}>
        {body}
      </Link>
    )
  if (onClick)
    return (
      <button type="button" onClick={onClick} className={rowClass}>
        {body}
      </button>
    )
  return <div className={rowClass}>{body}</div>
}
