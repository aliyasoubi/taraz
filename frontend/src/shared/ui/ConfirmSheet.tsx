import type { ReactNode } from 'react'
import { t } from '@/shared/lib/i18n'
import { Spinner } from './Button'
import { Sheet } from './Sheet'

/** An iOS action sheet: the question, the destructive choice, and Cancel set apart below. */
export function ConfirmSheet({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = t('common.delete'),
  loading,
}: {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: ReactNode
  confirmLabel?: string
  loading?: boolean
}) {
  return (
    <Sheet open={open} onClose={onClose}>
      <div className="overflow-hidden rounded-[14px] bg-surface text-center">
        <div className="px-5 py-4">
          <h3 className="text-[13px] font-semibold text-ink-2">{title}</h3>
          <p className="mt-1 text-[13px] leading-5 text-ink-2">{message}</p>
        </div>
        <button
          type="button"
          onClick={onConfirm}
          disabled={loading}
          className="grid h-14 w-full place-items-center text-[20px] text-debt hairline-t transition-colors active:bg-highlight"
        >
          {loading ? <Spinner /> : confirmLabel}
        </button>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="mt-2 h-14 w-full rounded-[14px] bg-surface text-[20px] font-semibold text-brand transition-colors active:bg-highlight"
      >
        {t('common.cancel')}
      </button>
    </Sheet>
  )
}
