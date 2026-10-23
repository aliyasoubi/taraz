import { Plus } from 'lucide-react'
import { useState } from 'react'
import { AccountCard } from '@/features/accounts/components/AccountCard'
import { AccountFormSheet } from '@/features/accounts/components/AccountFormSheet'
import type { Account } from '@/shared/api/types'
import { cx } from '@/shared/lib/cx'
import { t } from '@/shared/lib/i18n'
import { Pressable } from '@/shared/ui'
import { SectionLabel } from './SectionLabel'

/** The transfer's destination (or, for a refund, its source): a swipeable row of account cards. */
export function DestinationSection({
  accounts,
  selectedId,
  refund,
  onSelect,
}: {
  accounts: Account[]
  selectedId: number | null
  refund: boolean
  onSelect: (id: number | null) => void
}) {
  const [creating, setCreating] = useState(false)
  return (
    <div>
      <SectionLabel hint={refund ? t('txForm.refundFromHint') : t('txForm.destinationHint')}>
        {refund ? t('txForm.refundFromLabel') : t('txForm.destinationLabel')}
      </SectionLabel>
      <div className="-mx-5 no-scrollbar flex gap-3 overflow-x-auto px-5 py-1">
        {accounts.map((a) => (
          <Pressable
            key={a.id}
            onClick={() => onSelect(a.id === selectedId ? null : a.id)}
            className={cx(
              'shrink-0 rounded-2xl transition-opacity',
              selectedId !== null && a.id !== selectedId && 'opacity-45',
            )}
          >
            <AccountCard account={a} size="sm" selected={a.id === selectedId} />
          </Pressable>
        ))}
        <Pressable
          onClick={() => setCreating(true)}
          className="grid h-[92px] w-[110px] shrink-0 place-items-center rounded-2xl border border-dashed border-line-2 text-ink-3"
        >
          <span className="flex flex-col items-center gap-1 text-xs font-semibold">
            <Plus className="size-5" />
            {t('common.newAccount')}
          </span>
        </Pressable>
      </div>
      <AccountFormSheet
        key={creating ? 'open' : 'idle'}
        open={creating}
        onClose={() => setCreating(false)}
        onSaved={(a) => onSelect(a.id)}
      />
    </div>
  )
}
