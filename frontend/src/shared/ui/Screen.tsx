import { createContext, useContext, useLayoutEffect, useRef, type ReactNode, type RefObject } from 'react'
import { cx } from '@/shared/lib/cx'

const ScrollContext = createContext<RefObject<HTMLDivElement | null> | null>(null)

/** Where each screen was scrolled to, so going back lands where you left. */
const positions = new Map<string, number>()

/**
 * One screen with its own scroll area. During a push both screens are on stage
 * at once, side by side, each keeping its own scroll position.
 */
export function Screen({ id, children, className }: { id: string; children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const node = ref.current
    if (!node) return
    node.scrollTop = positions.get(id) ?? 0
    const save = () => positions.set(id, node.scrollTop)
    node.addEventListener('scroll', save, { passive: true })
    return () => node.removeEventListener('scroll', save)
  }, [id])

  return (
    <ScrollContext.Provider value={ref}>
      <div
        ref={ref}
        className={cx(
          'absolute inset-0 overflow-x-hidden overflow-y-auto overscroll-contain bg-bg pb-[calc(env(safe-area-inset-bottom)+84px)]',
          className,
        )}
      >
        <div className="mx-auto max-w-xl">{children}</div>
      </div>
    </ScrollContext.Provider>
  )
}

/** The scroll area of the screen this component sits in. */
export function useScreenScroll(): RefObject<HTMLDivElement | null> | null {
  return useContext(ScrollContext)
}
