import { motion } from 'motion/react'
import { useId } from 'react'
import { Banknote, Building2, CreditCard, HandCoins, Store, UserRound } from 'lucide-react'
import { faDigits } from '@/shared/lib/format'
import { ACCOUNT_KIND_LABEL, accountGradient } from '@/shared/lib/labels'
import type { Account, AccountKind } from '@/shared/api/types'
import { cx } from '@/shared/lib/cx'
import { Money } from '@/shared/ui'
import { t } from '@/shared/lib/i18n'

export const KIND_ICON: Record<AccountKind, typeof CreditCard> = {
  own: CreditCard,
  staff: UserRound,
  third_party: HandCoins,
  pos: Store,
  cash: Banknote,
  other: Building2,
}

/** A destination account drawn as a bank card. */
export function AccountCard({
  account,
  size = 'lg',
  selected,
  className,
}: {
  account: Pick<Account, 'title' | 'bank' | 'kind' | 'card_last4' | 'color' | 'owner_name'> & Partial<Account>
  size?: 'lg' | 'sm'
  selected?: boolean
  className?: string
}) {
  const Icon = KIND_ICON[account.kind]
  const patternId = useId()
  const small = size === 'sm'
  return (
    <motion.div
      className={cx(
        'relative isolate overflow-hidden text-white shadow-float',
        small ? 'h-[92px] w-[150px] rounded-2xl p-3' : 'aspect-[1.6] w-full rounded-[26px] p-5',
        selected && 'ring-2 ring-white/90 ring-offset-2 ring-offset-surface',
        className,
      )}
      style={{ background: accountGradient(account.color) }}
    >
      {/* sheen + pattern */}
      <div className="pointer-events-none absolute -top-16 -left-10 size-48 rounded-full bg-white/15 blur-2xl" />
      <div className="pointer-events-none absolute -right-10 -bottom-20 size-56 rounded-full bg-black/20 blur-2xl" />
      <svg className="pointer-events-none absolute inset-0 size-full opacity-[0.09]" aria-hidden>
        <defs>
          <pattern id={patternId} width="14" height="14" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.2" fill="white" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${patternId})`} />
      </svg>

      <div className="relative flex h-full flex-col justify-between">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className={cx('truncate font-bold', small ? 'text-[13px]' : 'text-lg')}>{account.title}</p>
            {!small && (
              <p className="mt-0.5 truncate text-[12px] text-white/75">
                {[
                  account.bank && t('accountCard.bank', { bank: account.bank }),
                  account.owner_name !== account.title && account.owner_name,
                  account.tx_count ? t('common.txCount', { n: faDigits(account.tx_count) }) : null,
                ]
                  .filter(Boolean)
                  .join(' · ') || ACCOUNT_KIND_LABEL[account.kind]}
              </p>
            )}
          </div>
          <div
            className={cx(
              'grid shrink-0 place-items-center rounded-xl bg-white/20 backdrop-blur',
              small ? 'size-7' : 'size-10',
            )}
          >
            <Icon className={small ? 'size-4' : 'size-5'} />
          </div>
        </div>

        {small ? (
          <p className="truncate text-[11px] text-white/80">
            {account.card_last4
              ? `•••• ${faDigits(account.card_last4)}`
              : (account.bank ?? ACCOUNT_KIND_LABEL[account.kind])}
          </p>
        ) : (
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-[11px] text-white/70">{t('accountCard.receivedThisMonth')}</p>
              <Money value={account.received_this_month ?? 0} className="text-2xl font-extrabold" />
            </div>
            <p dir="ltr" className="text-sm tracking-[0.2em] text-white/85 tabular">
              {account.card_last4 ? `•••• ${faDigits(account.card_last4)}` : ''}
            </p>
          </div>
        )}
      </div>
    </motion.div>
  )
}
