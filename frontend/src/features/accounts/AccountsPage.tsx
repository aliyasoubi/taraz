import { motion } from 'motion/react'
import { CreditCard, Plus } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { AccountCard } from '@/features/accounts/components/AccountCard'
import { AccountFormSheet } from '@/features/accounts/components/AccountFormSheet'
import { Button, Empty, IconButton, Money, PageHeader, Skeleton } from '@/shared/ui'
import { useAccounts } from '@/features/accounts/api'
import { t } from '@/shared/lib/i18n'

export function AccountsPage() {
  const { data, isLoading } = useAccounts()
  const [adding, setAdding] = useState(false)
  const active = (data ?? []).filter((a) => !a.is_archived)
  const archived = (data ?? []).filter((a) => a.is_archived)
  const monthTotal = active.reduce((s, a) => s + a.received_this_month, 0)

  return (
    <div>
      <PageHeader
        title={t('accounts.title')}
        subtitle={t('accounts.subtitle')}
        actions={
          <IconButton onClick={() => setAdding(true)} aria-label={t('common.newAccount')} className="text-brand">
            <Plus className="size-5" />
          </IconButton>
        }
      />
      <div className="px-4">
        {data && active.length > 0 && (
          <div className="mb-4 flex items-center justify-between rounded-3xl border border-line bg-surface/70 px-4 py-3">
            <span className="text-sm text-ink-2">{t('accounts.monthTotal')}</span>
            <Money value={monthTotal} tone="credit" className="text-lg font-extrabold" />
          </div>
        )}

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="aspect-[1.6] rounded-[26px]" />
            <Skeleton className="aspect-[1.6] rounded-[26px]" />
          </div>
        ) : active.length === 0 ? (
          <Empty
            icon={<CreditCard className="size-7" />}
            title={t('accounts.empty')}
            hint={t('accounts.emptyHint')}
            action={<Button onClick={() => setAdding(true)}>{t('accounts.addFirst')}</Button>}
          />
        ) : (
          <div className="space-y-4">
            {active.map((a, i) => (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, y: 40, rotateX: 18 }}
                animate={{ opacity: 1, y: 0, rotateX: 0 }}
                transition={{ type: 'spring', stiffness: 160, damping: 20, delay: i * 0.06 }}
                whileTap={{ scale: 0.98 }}
                style={{ transformPerspective: 900 }}
              >
                <Link to={`/accounts/${a.id}`} className="block">
                  <AccountCard account={a} />
                </Link>
              </motion.div>
            ))}
          </div>
        )}

        {archived.length > 0 && (
          <div className="mt-8">
            <p className="mb-2 px-1 text-[13px] font-bold text-ink-3">{t('common.archived')}</p>
            <div className="space-y-2">
              {archived.map((a) => (
                <Link
                  key={a.id}
                  to={`/accounts/${a.id}`}
                  className="flex items-center justify-between rounded-2xl border border-line bg-surface/60 px-4 py-3 text-sm"
                >
                  <span className="text-ink-2">{a.title}</span>
                  <Money value={a.received_total} compact className="text-ink-3" />
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
      <AccountFormSheet key={adding ? 'open' : 'closed'} open={adding} onClose={() => setAdding(false)} />
    </div>
  )
}
