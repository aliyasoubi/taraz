import { forwardRef, type ReactNode } from 'react'
import { cx } from '@/shared/lib/cx'

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

export const TextInput = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function TextInput(
  { className, ...rest },
  ref,
) {
  return <input ref={ref} className={cx(inputClass, className)} {...rest} />
})

export function TextArea({ className, ...rest }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cx(inputClass, 'h-auto min-h-20 py-3 leading-7', className)} rows={3} {...rest} />
}
