export const spring = { type: 'spring', stiffness: 420, damping: 32, mass: 0.8 } as const

/** Children fade/slide in one after another. */
export const listVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.035 } },
}
export const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: spring },
}
