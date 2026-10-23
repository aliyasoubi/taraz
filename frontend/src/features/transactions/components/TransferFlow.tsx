import { motion } from 'motion/react'
import { useAccounts } from '@/features/accounts/api'
import { AccountCard } from '@/features/accounts/components/AccountCard'
import type { Transaction } from '@/shared/api/types'
import { t } from '@/shared/lib/i18n'
import { Avatar } from '@/shared/ui'

/** Payer → account, with a dot travelling along the line like money in transit. */
export function TransferFlow({ tx }: { tx: Transaction }) {
  const accounts = useAccounts().data ?? []
  const account = accounts.find((a) => a.id === tx.account_id)
  const payer = tx.payer_name ?? tx.patient_name
  return (
    <div className="flex items-center gap-2">
      <div className="flex w-24 shrink-0 flex-col items-center text-center">
        <Avatar name={payer} size={48} />
        <p className="mt-2 line-clamp-2 text-[13px] leading-5 font-semibold">{payer}</p>
        <p className="text-[11px] text-ink-3">{tx.payer_name ? t('txDetail.payer') : t('common.self')}</p>
      </div>
      <div className="relative h-8 flex-1">
        <div className="absolute inset-x-0 top-1/2 border-t-2 border-dashed border-line-2" />
        <motion.div
          className="absolute top-1/2 size-3 -translate-y-1/2 rounded-full bg-credit shadow-[0_0_12px] shadow-credit"
          initial={{ right: '0%' }}
          animate={{ right: ['0%', '92%'] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut', repeatDelay: 0.4 }}
        />
      </div>
      <div className="flex w-[150px] shrink-0 flex-col items-center text-center">
        {account ? (
          <AccountCard account={account} size="sm" />
        ) : (
          <div className="grid h-[92px] w-[150px] place-items-center rounded-2xl border border-dashed border-line-2 text-xs text-ink-3">
            {t('txDetail.noAccount')}
          </div>
        )}
        <p className="mt-2 text-[11px] text-ink-3">{t('txDetail.destination')}</p>
      </div>
    </div>
  )
}
