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
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center px-8 py-14 text-center"
    >
      <div className="mb-3 text-ink-3 [&>svg]:size-12 [&>svg]:stroke-[1.5]">{icon}</div>
      <p className="text-[20px] font-bold text-ink">{title}</p>
      {hint && <p className="mt-1.5 text-[15px] leading-6 text-ink-2">{hint}</p>}
      {action && <div className="mt-5">{action}</div>}
    </motion.div>
  )
}
