import { motion, type HTMLMotionProps } from 'motion/react'
import { cx } from '@/shared/lib/cx'

export function Card({ className, children, ...rest }: HTMLMotionProps<'div'>) {
  return (
    <motion.div className={cx('rounded-[12px] bg-surface', className)} {...rest}>
      {children}
    </motion.div>
  )
}
