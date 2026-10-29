// Springs after SwiftUI's: stiffness = (2π / response)², damping = 4π · dampingFraction / response.

/** Controls and small layout changes — SwiftUI's `.snappy`. */
export const spring = { type: 'spring', stiffness: 320, damping: 30, mass: 1 } as const

/** Screens and sheets moving in and out — SwiftUI's `.smooth`, no overshoot. */
export const smooth = { type: 'spring', stiffness: 160, damping: 25, mass: 1, restDelta: 0.5 } as const

/** The curve UIKit uses for sheet presentation, for tweens that must end on time. */
export const iosEase = [0.32, 0.72, 0, 1] as const

export type StackDirection = 'push' | 'pop' | 'none'

const PUSH = { duration: 0.5, ease: iosEase }

/**
 * iOS navigation, mirrored for right-to-left: a pushed page comes in from the
 * left while the one beneath drifts a third of the way right; popping reverses
 * it. 'none' swaps at once, as switching tabs does.
 */
export const stackVariants = {
  enter: (d: StackDirection) =>
    d === 'push' ? { x: '-100%', zIndex: 2 } : d === 'pop' ? { x: '30%', zIndex: 1, opacity: 1 } : { x: 0, zIndex: 1 },
  center: { x: 0, opacity: 1, transition: PUSH },
  exit: (d: StackDirection) =>
    d === 'push'
      ? { x: '30%', zIndex: 1, transition: PUSH }
      : d === 'pop'
        ? { x: '-100%', zIndex: 2, transition: PUSH }
        : { opacity: 0, transition: { duration: 0 } },
}
