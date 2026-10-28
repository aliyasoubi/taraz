import type { TxType } from '@/shared/api/types'
import { t } from '@/shared/lib/i18n'
import { Button } from '@/shared/ui'

/** The two things done most: record a payment, record a treatment charge. The rest live in the ⋯ menu. */
export function QuickActions({ onAdd }: { onAdd: (type: TxType) => void }) {
  return (
    <div className="mt-3 grid grid-cols-2 gap-3">
      <Button onClick={() => onAdd('payment')}>{t('patient.addPayment')}</Button>
      <Button variant="secondary" onClick={() => onAdd('charge')}>
        {t('patient.addCharge')}
      </Button>
    </div>
  )
}
