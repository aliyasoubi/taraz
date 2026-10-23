import { motion, type HTMLMotionProps } from 'motion/react'
import { forwardRef } from 'react'
import { cx } from '@/shared/lib/cx'
import { spring } from './motion'

export type PressableProps = HTMLMotionProps<'button'>

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
      className={cx('outline-none select-none focus-visible:ring-2 focus-visible:ring-brand/60', className)}
      {...rest}
    />
  )
})
