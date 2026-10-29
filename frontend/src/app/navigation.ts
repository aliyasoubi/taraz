// How screens stack, free of React so the rules can be unit-tested.
import type { NavigationType } from 'react-router'
import type { StackDirection } from '@/shared/ui/motion'

/** 'PUSH' | 'POP' | 'REPLACE' — the router's enum, accepted as its plain values. */
type NavType = `${NavigationType}`

/** The first screen of each tab. */
export const TAB_ROOTS = ['/', '/receipts', '/month'] as const

export function isTabRoot(path: string): boolean {
  return (TAB_ROOTS as readonly string[]).includes(path)
}

/** Switching tabs is instant on iOS; going deeper slides in, going back slides out. */
export function directionOf(from: string, to: string, type: NavType): StackDirection {
  if (isTabRoot(to) && (isTabRoot(from) || type !== 'POP')) return 'none'
  return type === 'POP' ? 'pop' : 'push'
}

/**
 * The screens under the current one, oldest first, ending with `to`. A tab's
 * first screen starts a new stack; going back trims to the screen returned to.
 */
export function nextStack(stack: readonly string[], to: string, type: NavType): string[] {
  if (isTabRoot(to) && type !== 'POP') return [to]
  if (type === 'POP') {
    const i = stack.lastIndexOf(to)
    return i >= 0 ? stack.slice(0, i + 1) : [to]
  }
  if (type === 'REPLACE') return [...stack.slice(0, -1), to]
  return [...stack, to]
}

/** Whether a swipe from the edge has gone far enough, or fast enough, to go back. */
export function swipeCompletes(offset: number, velocity: number, width: number): boolean {
  return -offset > width * 0.35 || velocity < -500
}
