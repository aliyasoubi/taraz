import { ArrowLeft } from 'lucide-react'
import { useAccounts } from '@/features/accounts/api'
import { AccountCard } from '@/features/accounts/components/AccountCard'
import type { Transaction } from '@/shared/api/types'
import { t } from '@/shared/lib/i18n'
import { Avatar } from '@/shared/ui'

/** Payer → account: who paid, and the card the money landed on. */
export function TransferFlow({ tx }: { tx: Transaction }) {
  const accounts = useAccounts().data ?? []
  const account = accounts.find((a) => a.id === tx.account_id)
  const payer = tx.payer_name ?? tx.patient_name
  return (
    <div className="flex items-center gap-2">
      <div className="flex w-24 shrink-0 flex-col items-center text-center">
        <Avatar name={payer} size={48} />
        <p className="mt-2 line-clamp-2 text-[15px] leading-5">{payer}</p>
        <p className="text-[12px] text-ink-2">{tx.payer_name ? t('txDetail.payer') : t('common.self')}</p>
      </div>
      <div className="grid flex-1 place-items-center text-ink-3">
        <ArrowLeft className="size-5" />
      </div>
      <div className="flex w-[150px] shrink-0 flex-col items-center text-center">
        {account ? (
          <AccountCard account={account} size="sm" />
        ) : (
          <div className="grid h-[92px] w-[150px] place-items-center rounded-[10px] bg-fill text-[13px] text-ink-2">
            {t('txDetail.noAccount')}
          </div>
        )}
        <p className="mt-2 text-[12px] text-ink-2">{t('txDetail.destination')}</p>
      </div>
    </div>
  )
}
