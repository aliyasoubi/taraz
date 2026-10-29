import { Archive, ArchiveRestore, Ellipsis, Inbox, Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { AccountCard } from '@/features/accounts/components/AccountCard'
import { AccountFormSheet } from '@/features/accounts/components/AccountFormSheet'
import { useAccount, useDeleteAccount, useSaveAccount } from '@/features/accounts/api'
import { TxRow } from '@/features/transactions/components/TxRow'
import { useTransactions } from '@/features/transactions/api'
import { cx } from '@/shared/lib/cx'
import { errorMessage } from '@/shared/lib/errors'
import { faDigits } from '@/shared/lib/format'
import { t } from '@/shared/lib/i18n'
import { jToIso, monthLength } from '@/shared/lib/jalali'
import {
  ConfirmSheet,
  Empty,
  IconButton,
  ListIcon,
  ListRow,
  ListSection,
  Money,
  MonthSwitcher,
  PageHeader,
  Sheet,
  Skeleton,
  useMonthState,
} from '@/shared/ui'

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

  const toggleArchive = () => {
    if (!account) return
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

  return (
    <div>
      <PageHeader
        large={false}
        titleAfter={200}
        back={t('nav.accounts')}
        title={account?.title ?? ''}
        actions={
          <IconButton onClick={() => setSheet('menu')} aria-label={t('common.options')}>
            <span className="grid size-[26px] place-items-center rounded-full border-[1.8px] border-current">
              <Ellipsis className="size-4" strokeWidth={3} />
            </span>
          </IconButton>
        }
      />
      <div className="px-4">
        {account ? <AccountCard account={account} /> : <Skeleton className="aspect-[1.6] rounded-[16px]" />}

        {account && (
          <ListSection className="mt-6">
            <ListRow title={t('account.totalReceived')} value={<Money value={account.received_total} />} />
            <ListRow title={t('account.txCount')} value={faDigits(account.tx_count)} />
          </ListSection>
        )}

        <div className="mt-8">
          <MonthSwitcher value={month} onShift={shift} dir={dir} />
        </div>
        <ListSection className="mt-3">
          <ListRow title={t('account.receivedInMonth')} value={<Money value={received} className="text-credit" />} />
          <ListRow
            title={t('account.chequesInTransit')}
            value={<Money value={pending} className={cx(pending > 0 && 'text-warn')} />}
          />
        </ListSection>

        <div className={cx('transition-opacity', isFetching && 'opacity-60')}>
          {!page ? (
            <Skeleton className="mt-8 h-40" />
          ) : page.items.length === 0 ? (
            <Empty icon={<Inbox />} title={t('account.emptyMonth')} />
          ) : (
            <ListSection>
              {page.items.map((tx) => (
                <TxRow key={tx.id} tx={tx} showPatient />
              ))}
            </ListSection>
          )}
        </div>
      </div>

      {account && (
        <>
          <Sheet open={sheet === 'menu'} onClose={() => setSheet(null)} title={account.title}>
            <ListSection className="mt-1">
              <ListRow
                icon={
                  <ListIcon tone="gray">
                    <Pencil />
                  </ListIcon>
                }
                title={t('account.edit')}
                onClick={() => setSheet('edit')}
              />
              <ListRow
                icon={<ListIcon tone="gray">{account.is_archived ? <ArchiveRestore /> : <Archive />}</ListIcon>}
                title={account.is_archived ? t('common.unarchive') : t('account.archive')}
                onClick={toggleArchive}
              />
            </ListSection>
            <ListSection className="mt-6">
              <ListRow
                icon={
                  <ListIcon tone="debt">
                    <Trash2 />
                  </ListIcon>
                }
                title={t('account.delete')}
                destructive
                onClick={() => setSheet('delete')}
              />
            </ListSection>
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
