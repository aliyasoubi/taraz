import { forwardRef, type ReactNode } from 'react'
import { cx } from '@/shared/lib/cx'

export function Field({ label, hint, children }: { label: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block px-4 text-[13px] text-ink-2">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block px-4 text-[13px] text-ink-2">{hint}</span>}
    </label>
  )
}

export const inputClass =
  'h-11 w-full rounded-[10px] bg-surface px-4 text-ink caret-brand placeholder:text-ink-3 outline-none'

export const TextInput = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function TextInput(
  { className, ...rest },
  ref,
) {
  return <input ref={ref} className={cx(inputClass, className)} {...rest} />
})

export function TextArea({ className, ...rest }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cx(inputClass, 'h-auto min-h-20 py-3 leading-7', className)} rows={3} {...rest} />
}
