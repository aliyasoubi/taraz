import { AnimatePresence, motion, useDragControls } from 'motion/react'
import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cx } from '@/shared/lib/cx'
import { t } from '@/shared/lib/i18n'
import { iosEase } from './motion'

let openSheets = 0

/** Tells the stylesheet how many sheets are up, so the screen behind recedes like a card. */
function markSheets(): void {
  const root = document.documentElement
  if (openSheets > 0) root.dataset.sheet = String(Math.min(openSheets, 2))
  else delete root.dataset.sheet
}

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

/**
 * A sheet that slides up over the screen, which shrinks back behind it.
 * With `leading`/`trailing` it gets an iOS modal bar (Cancel · Title · Done);
 * otherwise a title with a round close button. Drag the grabber down to dismiss.
 * `large` gives the full-height detent; `bare` hands the body to the caller (for
 * screens that navigate inside the sheet).
 */
export function Sheet({
  open,
  onClose,
  title,
  subtitle,
  leading,
  trailing,
  children,
  footer,
  large,
  bare,
  className,
}: {
  open: boolean
  onClose: () => void
  title?: ReactNode
  subtitle?: ReactNode
  leading?: ReactNode
  trailing?: ReactNode
  children: ReactNode
  footer?: ReactNode
  large?: boolean
  bare?: boolean
  className?: string
}) {
  const controls = useDragControls()
  const keyboard = useKeyboardInset(open)
  const modalBar = leading !== undefined || trailing !== undefined

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    openSheets++
    markSheets()
    return () => {
      window.removeEventListener('keydown', onKey)
      openSheets--
      markSheets()
    }
  }, [open, onClose])

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50">
          <motion.div
            className="absolute inset-0 bg-[var(--dim)]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: 0.5, ease: iosEase } }}
            exit={{ opacity: 0, transition: { duration: 0.35, ease: iosEase } }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            className={cx(
              'elevated absolute inset-x-0 mx-auto flex max-h-[calc(100dvh-max(env(safe-area-inset-top),10px)-10px)] max-w-xl flex-col rounded-t-[14px] bg-bg shadow-float',
              large && 'top-[calc(max(env(safe-area-inset-top),10px)+10px)]',
              className,
            )}
            style={{ bottom: keyboard }}
            initial={{ y: '100%' }}
            animate={{ y: 0, transition: { duration: 0.5, ease: iosEase } }}
            exit={{ y: '100%', transition: { duration: 0.35, ease: iosEase } }}
            drag="y"
            dragListener={false}
            dragControls={controls}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.04, bottom: 0.8 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 110 || info.velocity.y > 650) onClose()
            }}
          >
            <div
              className="shrink-0 cursor-grab touch-none px-4 pt-1.5 active:cursor-grabbing"
              onPointerDown={(e) => controls.start(e)}
            >
              <div className="mx-auto h-[5px] w-9 rounded-full bg-ink-3/60" />
              {modalBar ? (
                <div className="grid h-12 grid-cols-[1fr_auto_1fr] items-center">
                  <div className="flex justify-start">{leading}</div>
                  <h2 className="max-w-[50vw] truncate text-[17px] font-semibold">{title}</h2>
                  <div className="flex justify-end">{trailing}</div>
                </div>
              ) : title || subtitle ? (
                <div className="flex items-start justify-between gap-3 pt-3 pb-1">
                  <div className="min-w-0">
                    {title && <h2 className="truncate text-[20px] font-bold">{title}</h2>}
                    {subtitle && <p className="mt-0.5 truncate text-[13px] text-ink-2">{subtitle}</p>}
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    className="grid size-[30px] shrink-0 place-items-center rounded-full bg-fill text-ink-2"
                    aria-label={t('common.close')}
                  >
                    <X className="size-4" strokeWidth={2.6} />
                  </button>
                </div>
              ) : (
                <div className="h-3" />
              )}
            </div>
            {bare ? (
              <div className="relative min-h-0 flex-1 overflow-hidden">{children}</div>
            ) : (
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-2 pb-5">{children}</div>
            )}
            {footer && <div className="shrink-0 px-4 pt-2 pb-safe">{footer}</div>}
            {!footer && <div className="pb-safe" />}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

/** A plain text button for a sheet's modal bar; `strong` for the confirming one. */
export function BarButton({
  children,
  onClick,
  strong,
  disabled,
}: {
  children: ReactNode
  onClick: () => void
  strong?: boolean
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cx(
        'h-11 px-1 text-[17px] text-brand transition-opacity active:opacity-40 disabled:text-ink-3',
        strong && 'font-semibold',
      )}
    >
      {children}
    </button>
  )
}
