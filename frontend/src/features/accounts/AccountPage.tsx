import { motion } from 'motion/react'
import { Archive, ArchiveRestore, Inbox, Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { AccountCard } from '@/features/accounts/components/AccountCard'
import { cx } from '@/shared/lib/cx'
import {
  Card,
  ConfirmSheet,
  Empty,
  IconButton,
  listVariants,
  MenuItem,
  Money,
  MonthSwitcher,
  PageHeader,
  Sheet,
  Skeleton,
  useMonthState,
} from '@/shared/ui'
import { AccountFormSheet } from '@/features/accounts/components/AccountFormSheet'
import { errorMessage } from '@/shared/lib/errors'
import { TxRow } from '@/features/transactions/components/TxRow'
import { faDigits } from '@/shared/lib/format'
import { jToIso, monthLength } from '@/shared/lib/jalali'
import { ACCOUNT_KIND_LABEL } from '@/shared/lib/labels'
import { useAccount, useDeleteAccount, useSaveAccount } from '@/features/accounts/api'
import { useTransactions } from '@/features/transactions/api'
import { t } from '@/shared/lib/i18n'

export function AccountPage() {
  const id = Number(useParams().id)
  const navigate = useNavigate()
  const { data: account } = useAccount(id)
  const [month, shift, dir] = useMonthState()
  const [sheet, setSheet] = useState<null | 'menu' | 'edit' | 'delete'>(null)
  const from = jToIso({ jy: month.jy, jm: month.jm, jd: 1 })
  const to = jToIso({ jy: month.jy, jm: month.jm, jd: monthLength(month.jy, month.jm) })
  const { data: page, isFetching } = useTransactions({ account_id: id, from, to, by_effective_date: true, limit: 500 })
  const save = useSaveAccount()
  const del = useDeleteAccount()

  const received = (page?.items ?? [])
    .filter((tx) => tx.type === 'payment' && tx.counts)
    .reduce((sum, tx) => sum + tx.amount, 0)
  const pending = (page?.items ?? [])
    .filter((tx) => !tx.counts && tx.cheque_status === 'pending')
    .reduce((sum, tx) => sum + tx.amount, 0)

  return (
    <div>
      <PageHeader
        back
        title={account?.title ?? '…'}
        subtitle={account ? ACCOUNT_KIND_LABEL[account.kind] : undefined}
        actions={
          <IconButton onClick={() => setSheet('menu')} aria-label={t('common.options')}>
            <Pencil className="size-[18px]" />
          </IconButton>
        }
      />
      <div className="px-4">
        {account ? (
          <motion.div
            initial={{ rotateY: -25, opacity: 0 }}
            animate={{ rotateY: 0, opacity: 1 }}
            style={{ transformPerspective: 1000 }}
          >
            <AccountCard account={account} />
          </motion.div>
        ) : (
          <Skeleton className="aspect-[1.6] rounded-[26px]" />
        )}

        {account && (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Stat label={t('account.totalReceived')} value={<Money value={account.received_total} compact />} />
            <Stat label={t('account.txCount')} value={faDigits(account.tx_count)} />
          </div>
        )}

        <div className="mt-6">
          <MonthSwitcher value={month} onShift={shift} dir={dir} />
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <Stat label={t('account.receivedInMonth')} value={<Money value={received} tone="credit" />} />
          <Stat
            label={t('account.chequesInTransit')}
            value={<Money value={pending} className={cx(pending > 0 && 'text-warn')} />}
          />
        </div>

        <Card className={cx('mt-4 p-1.5 transition-opacity', isFetching && 'opacity-60')}>
          {!page ? (
            <Skeleton className="m-2 h-40" />
          ) : page.items.length === 0 ? (
            <Empty icon={<Inbox className="size-7" />} title={t('account.emptyMonth')} />
          ) : (
            <motion.div key={from} variants={listVariants} initial="hidden" animate="show">
              {page.items.map((tx) => (
                <TxRow key={tx.id} tx={tx} showPatient />
              ))}
            </motion.div>
          )}
        </Card>
      </div>

      {account && (
        <>
          <Sheet open={sheet === 'menu'} onClose={() => setSheet(null)} title={account.title}>
            <div className="space-y-2">
              <MenuItem
                icon={<Pencil className="size-5" />}
                label={t('account.edit')}
                onClick={() => setSheet('edit')}
              />
              <MenuItem
                icon={account.is_archived ? <ArchiveRestore className="size-5" /> : <Archive className="size-5" />}
                label={account.is_archived ? t('common.unarchive') : t('account.archive')}
                onClick={() =>
                  save.mutate(
                    { id: account.id, data: { is_archived: !account.is_archived } },
                    {
                      onSuccess: () => {
                        toast.success(account.is_archived ? t('account.activated') : t('account.archivedToast'))
                        setSheet(null)
                      },
                      onError: (e) => toast.error(errorMessage(e)),
                    },
                  )
                }
              />
              <MenuItem
                icon={<Trash2 className="size-5" />}
                label={t('account.delete')}
                danger
                onClick={() => setSheet('delete')}
              />
            </div>
          </Sheet>
          <AccountFormSheet
            key={sheet === 'edit' ? 'edit' : 'idle'}
            open={sheet === 'edit'}
            account={account}
            onClose={() => setSheet(null)}
          />
          <ConfirmSheet
            open={sheet === 'delete'}
            onClose={() => setSheet(null)}
            loading={del.isPending}
            title={t('account.deleteTitle')}
            message={t('account.deleteMessage')}
            onConfirm={() =>
              del.mutate(account.id, {
                onSuccess: () => {
                  toast.success(t('account.deleted'))
                  navigate('/accounts', { replace: true })
                },
                onError: (e) => {
                  toast.error(errorMessage(e))
                  setSheet(null)
                },
              })
            }
          />
        </>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-line bg-surface/70 px-4 py-3">
      <p className="text-[11px] text-ink-3">{label}</p>
      <div className="mt-0.5 text-[15px] font-bold">{value}</div>
    </div>
  )
}
