import { motion, type HTMLMotionProps } from 'motion/react'
import { forwardRef } from 'react'
import { cx } from '@/shared/lib/cx'

export type PressableProps = HTMLMotionProps<'button'>

/** A button that dims while pressed and eases back on release, as UIKit buttons do. */
export const Pressable = forwardRef<HTMLButtonElement, PressableProps>(function Pressable(
  { className, type = 'button', ...rest },
  ref,
) {
  return (
    <motion.button
      ref={ref}
      type={type}
      whileTap={{ opacity: 0.45, transition: { duration: 0 } }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className={cx('outline-none select-none focus-visible:ring-2 focus-visible:ring-brand/60', className)}
      {...rest}
    />
  )
})
