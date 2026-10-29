import { motion } from 'motion/react'
import { cx } from '@/shared/lib/cx'
import { spring } from './motion'

/** The iOS switch: green when on, a white knob that slides across. */
export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cx(
        'flex h-[31px] w-[51px] shrink-0 items-center rounded-full p-0.5 transition-colors duration-200',
        checked ? 'justify-end bg-credit' : 'justify-start bg-fill',
      )}
    >
      <motion.span
        layout
        layoutDependency={checked}
        transition={spring}
        className="size-[27px] rounded-full bg-white shadow-[0_3px_8px_rgb(0_0_0/0.15)]"
      />
    </button>
  )
}
