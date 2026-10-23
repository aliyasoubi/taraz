import { AlertTriangle } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from './Button'
import { Sheet } from './Sheet'
import { t } from '@/shared/lib/i18n'

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
      <div className="flex flex-col items-center pt-2 pb-2 text-center">
        <div className="mb-4 grid size-14 place-items-center rounded-2xl bg-debt/12 text-debt">
          <AlertTriangle className="size-7" />
        </div>
        <h3 className="text-lg font-bold">{title}</h3>
        <p className="mt-2 text-sm leading-7 text-ink-2">{message}</p>
        <div className="mt-6 grid w-full grid-cols-2 gap-3">
          <Button variant="secondary" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button variant="danger" onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Sheet>
  )
}
