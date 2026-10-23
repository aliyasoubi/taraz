import { motion, type HTMLMotionProps } from 'motion/react'
import { forwardRef, useId, type ReactNode } from 'react'

export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ')
}

export const spring = { type: 'spring', stiffness: 420, damping: 32, mass: 0.8 } as const

type PressableProps = HTMLMotionProps<'button'>

/** A button that gives physical feedback: a quick, springy press. */
export const Pressable = forwardRef<HTMLButtonElement, PressableProps>(function Pressable(
  { className, type = 'button', ...rest },
  ref,
) {
  return (
    <motion.button
      ref={ref}
      type={type}
      whileTap={{ scale: 0.96 }}
      transition={spring}
      className={cx('select-none outline-none focus-visible:ring-2 focus-visible:ring-brand/60', className)}
      {...rest}
    />
  )
})

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
      className={cx('inline-block size-5 animate-spin rounded-full border-2 border-current border-t-transparent', className)}
      aria-label="در حال بارگذاری"
    />
  )
}

export function Card({ className, children, ...rest }: HTMLMotionProps<'div'>) {
  return (
    <motion.div className={cx('rounded-3xl border border-line bg-surface/80 backdrop-blur-xl', className)} {...rest}>
      {children}
    </motion.div>
  )
}

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
  const id = useId()
  return (
    <div className={cx('flex rounded-2xl border border-line bg-surface-2/70 p-1', className)} role="tablist">
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
              'relative flex-1 rounded-xl px-2 py-2 text-[13px] font-semibold transition-colors',
              active ? 'text-ink' : 'text-ink-3',
            )}
          >
            {active && (
              <motion.span
                layoutId={`seg-${id}`}
                transition={spring}
                className={cx('absolute inset-0 rounded-xl bg-surface shadow-sm ring-1 ring-line', o.tone)}
              />
            )}
            <span className="relative">{o.label}</span>
          </button>
        )
      })}
    </div>
  )
}

export function Field({ label, hint, children }: { label: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-medium text-ink-2">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-ink-3">{hint}</span>}
    </label>
  )
}

export const inputClass =
  'h-12 w-full rounded-2xl border border-line bg-surface-2/70 px-4 text-ink placeholder:text-ink-3 outline-none transition focus:border-brand/60 focus:bg-surface-2 focus:ring-4 focus:ring-brand/15'

export const TextInput = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function TextInput({ className, ...rest }, ref) {
    return <input ref={ref} className={cx(inputClass, className)} {...rest} />
  },
)

export function TextArea({ className, ...rest }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cx(inputClass, 'h-auto min-h-20 py-3 leading-7', className)} rows={3} {...rest} />
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx('shimmer rounded-2xl', className)} />
}

export function Empty({ icon, title, hint, action }: { icon: ReactNode; title: string; hint?: string; action?: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center px-6 py-12 text-center"
    >
      <div className="mb-4 grid size-16 place-items-center rounded-3xl border border-line bg-surface-2 text-ink-3">
        {icon}
      </div>
      <p className="font-semibold text-ink">{title}</p>
      {hint && <p className="mt-1 text-sm leading-6 text-ink-3">{hint}</p>}
      {action && <div className="mt-5">{action}</div>}
    </motion.div>
  )
}

export function Badge({ tone = 'neutral', children }: { tone?: 'neutral' | 'debt' | 'credit' | 'warn' | 'info'; children: ReactNode }) {
  const tones = {
    neutral: 'bg-surface-2 text-ink-2 border-line',
    debt: 'bg-debt/12 text-debt border-debt/20',
    credit: 'bg-credit/12 text-credit border-credit/20',
    warn: 'bg-warn/12 text-warn border-warn/25',
    info: 'bg-info/12 text-info border-info/20',
  }
  return (
    <span className={cx('inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-semibold', tones[tone])}>
      {children}
    </span>
  )
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 mt-7 flex items-center justify-between px-1">
      <h2 className="text-[15px] font-bold text-ink">{children}</h2>
      {action}
    </div>
  )
}

/** Children fade/slide in one after another. */
export const listVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.035 } },
}
export const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: spring },
}
