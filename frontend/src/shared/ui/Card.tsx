import { motion, type HTMLMotionProps } from 'motion/react'
import { cx } from '@/shared/lib/cx'

export function Card({ className, children, ...rest }: HTMLMotionProps<'div'>) {
  return (
    <motion.div className={cx('rounded-3xl border border-line bg-surface/80 backdrop-blur-xl', className)} {...rest}>
      {children}
    </motion.div>
  )
}
