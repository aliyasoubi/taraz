import { AnimatePresence, motion, useDragControls } from 'motion/react'
import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cx } from './ui'
import { t } from '@/lib/i18n'

let openSheets = 0

/**
 * iOS keeps `position: fixed; bottom: 0` under the on-screen keyboard. Lift the
 * sheet by however much of the layout viewport the keyboard covers.
 */
function useKeyboardInset(active: boolean): number {
  const [inset, setInset] = useState(0)
  useEffect(() => {
    const vv = window.visualViewport
    if (!active || !vv) return
    const update = () => setInset(Math.max(0, window.innerHeight - vv.height - vv.offsetTop))
    update()
    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    return () => {
      vv.removeEventListener('resize', update)
      vv.removeEventListener('scroll', update)
      setInset(0)
    }
  }, [active])
  return inset
}

export function Sheet({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  className,
}: {
  open: boolean
  onClose: () => void
  title?: ReactNode
  subtitle?: ReactNode
  children: ReactNode
  footer?: ReactNode
  className?: string
}) {
  const controls = useDragControls()
  const keyboard = useKeyboardInset(open)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    openSheets++
    document.documentElement.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      if (--openSheets === 0) document.documentElement.style.overflow = ''
    }
  }, [open, onClose])

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50">
          <motion.div
            className="absolute inset-0 bg-black/55 backdrop-blur-[3px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            className={cx(
              'absolute inset-x-0 mx-auto flex max-h-[min(92dvh,900px)] max-w-xl flex-col rounded-t-[30px] border-t border-line-2 bg-surface shadow-float',
              className,
            )}
            style={{ bottom: keyboard }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 34, stiffness: 340, mass: 0.9 }}
            drag="y"
            dragListener={false}
            dragControls={controls}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.05, bottom: 0.7 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 110 || info.velocity.y > 650) onClose()
            }}
          >
            <div
              className="shrink-0 cursor-grab touch-none px-5 pb-2 pt-2.5 active:cursor-grabbing"
              onPointerDown={(e) => controls.start(e)}
            >
              <div className="mx-auto mb-2 h-1.5 w-10 rounded-full bg-line-2" />
              {(title || subtitle) && (
                <div className="flex items-start justify-between gap-3 pt-1">
                  <div className="min-w-0">
                    {title && <h2 className="truncate text-lg font-bold text-ink">{title}</h2>}
                    {subtitle && <p className="mt-0.5 truncate text-[13px] text-ink-3">{subtitle}</p>}
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    className="grid size-8 shrink-0 place-items-center rounded-full bg-surface-2 text-ink-3"
                    aria-label={t('common.close')}
                  >
                    <X className="size-4" />
                  </button>
                </div>
              )}
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5 pt-2">{children}</div>
            {footer && <div className="shrink-0 border-t border-line bg-surface px-5 pb-safe pt-3">{footer}</div>}
            {!footer && <div className="pb-safe" />}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
