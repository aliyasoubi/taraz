import { motion } from 'motion/react'
import type { ReactNode } from 'react'

export function Empty({
  icon,
  title,
  hint,
  action,
}: {
  icon: ReactNode
  title: string
  hint?: string
  action?: ReactNode
}) {
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
