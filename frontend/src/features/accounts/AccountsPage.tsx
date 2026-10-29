import { CreditCard, Plus } from 'lucide-react'
import { useState } from 'react'
import { KIND_ICON } from '@/features/accounts/components/AccountCard'
import { AccountFormSheet } from '@/features/accounts/components/AccountFormSheet'
import { useAccounts } from '@/features/accounts/api'
import type { Account } from '@/shared/api/types'
import { t } from '@/shared/lib/i18n'
import { accountAccent } from '@/shared/lib/labels'
import {
  AnimatedMoney,
  Button,
  Empty,
  IconButton,
  ListRow,
  ListSection,
  Money,
  PageHeader,
  Skeleton,
} from '@/shared/ui'

/** Where payments land: one row per account, with what it received this month. */
export function AccountsPage() {
  const { data, isLoading } = useAccounts()
  const [adding, setAdding] = useState(false)
  const active = (data ?? []).filter((a) => !a.is_archived)
  const archived = (data ?? []).filter((a) => a.is_archived)
  const monthTotal = active.reduce((s, a) => s + a.received_this_month, 0)

  return (
    <div>
      <PageHeader
        back={t('settings.title')}
        title={t('accounts.title')}
        actions={
          <IconButton onClick={() => setAdding(true)} aria-label={t('common.newAccount')}>
            <Plus className="size-[26px]" />
          </IconButton>
        }
      />
      <div className="px-4">
        {isLoading ? (
          <Skeleton className="mt-2 h-64" />
        ) : active.length === 0 ? (
          <Empty
            icon={<CreditCard />}
            title={t('accounts.empty')}
            hint={t('accounts.emptyHint')}
            action={<Button onClick={() => setAdding(true)}>{t('accounts.addFirst')}</Button>}
          />
        ) : (
          <>
            <div className="mt-2 rounded-[12px] bg-surface px-4 pt-3.5 pb-4">
              <p className="text-[13px] text-ink-2">{t('accounts.monthTotal')}</p>
              <AnimatedMoney value={monthTotal} maxSize={34} className="mt-0.5 font-bold tracking-tight" />
            </div>
            <ListSection footer={t('accounts.subtitle')}>
              {active.map((a) => (
                <AccountRow key={a.id} account={a} />
              ))}
            </ListSection>
          </>
        )}

        {archived.length > 0 && (
          <ListSection header={t('common.archived')}>
            {archived.map((a) => (
              <AccountRow key={a.id} account={a} />
            ))}
          </ListSection>
        )}
      </div>
      <AccountFormSheet key={adding ? 'open' : 'closed'} open={adding} onClose={() => setAdding(false)} />
    </div>
  )
}

function AccountRow({ account: a }: { account: Account }) {
  const Icon = KIND_ICON[a.kind]
  return (
    <ListRow
      to={`/accounts/${a.id}`}
      icon={
        <span
          className="grid size-[29px] place-items-center rounded-[7px] text-white"
          style={{ background: accountAccent(a.color) }}
        >
          <Icon className="size-[17px]" />
        </span>
      }
      title={a.title}
      subtitle={[a.owner_name !== a.title && a.owner_name, a.bank].filter(Boolean).join(' · ') || undefined}
      value={<Money value={a.is_archived ? a.received_total : a.received_this_month} compact unit={false} />}
      chevron
    />
  )
}
