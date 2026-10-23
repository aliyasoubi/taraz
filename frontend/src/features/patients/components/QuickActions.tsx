import { BadgePercent, Banknote, Stethoscope } from 'lucide-react'
import type { ReactNode } from 'react'
import type { TxType } from '@/shared/api/types'
import { cx } from '@/shared/lib/cx'
import { t } from '@/shared/lib/i18n'
import { Pressable } from '@/shared/ui'

const ACTIONS: { type: TxType; label: () => string; icon: ReactNode; tone: string }[] = [
  { type: 'payment', label: () => t('patient.addPayment'), icon: <Banknote className="size-5" />, tone: 'text-credit' },
  { type: 'charge', label: () => t('patient.addCharge'), icon: <Stethoscope className="size-5" />, tone: 'text-debt' },
  {
    type: 'discount',
    label: () => t('patient.addDiscount'),
    icon: <BadgePercent className="size-5" />,
    tone: 'text-info',
  },
]

export function QuickActions({ onAdd }: { onAdd: (type: TxType) => void }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {ACTIONS.map(({ type, label, icon, tone }) => (
        <Pressable
          key={type}
          onClick={() => onAdd(type)}
          className="flex flex-col items-center gap-1.5 rounded-3xl border border-line bg-surface/80 py-3.5"
        >
          <span className={cx('grid size-10 place-items-center rounded-2xl bg-current/10', tone)}>{icon}</span>
          <span className="text-[12px] font-semibold text-ink-2">{label()}</span>
        </Pressable>
      ))}
    </div>
  )
}
