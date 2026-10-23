import { motion } from 'motion/react'
import { Archive, ArchiveRestore, Inbox, Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { AccountCard } from '@/components/AccountCard'
import { ConfirmSheet } from '@/components/ConfirmSheet'
import { AccountFormSheet, errorMessage } from '@/components/forms'
import { Money } from '@/components/Money'
import { MonthSwitcher, useMonthState } from '@/components/MonthSwitcher'
import { PageHeader } from '@/components/PageHeader'
import { Sheet } from '@/components/Sheet'
import { TxRow } from '@/components/TxRow'
import { Card, cx, Empty, IconButton, listVariants, Pressable, Skeleton } from '@/components/ui'
import { faDigits } from '@/lib/format'
import { jToIso, monthLength } from '@/lib/jalali'
import { ACCOUNT_KIND_LABEL } from '@/lib/labels'
import { useAccount, useDeleteAccount, useSaveAccount, useTransactions } from '@/lib/queries'

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

  const received = (page?.items ?? []).filter((t) => t.type === 'payment' && t.counts).reduce((s, t) => s + t.amount, 0)
  const pending = (page?.items ?? []).filter((t) => !t.counts && t.cheque_status === 'pending').reduce((s, t) => s + t.amount, 0)

  return (
    <div>
      <PageHeader
        back
        title={account?.title ?? '…'}
        subtitle={account ? ACCOUNT_KIND_LABEL[account.kind] : undefined}
        actions={
          <IconButton onClick={() => setSheet('menu')} aria-label="گزینه‌ها">
            <Pencil className="size-[18px]" />
          </IconButton>
        }
      />
      <div className="px-4">
        {account ? (
          <motion.div initial={{ rotateY: -25, opacity: 0 }} animate={{ rotateY: 0, opacity: 1 }} style={{ transformPerspective: 1000 }}>
            <AccountCard account={account} />
          </motion.div>
        ) : (
          <Skeleton className="aspect-[1.6] rounded-[26px]" />
        )}

        {account && (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Stat label="کل واریزی" value={<Money value={account.received_total} compact />} />
            <Stat label="تعداد تراکنش" value={faDigits(account.tx_count)} />
          </div>
        )}

        <div className="mt-6">
          <MonthSwitcher value={month} onShift={shift} dir={dir} />
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <Stat label="واریز در این ماه" value={<Money value={received} tone="credit" />} />
          <Stat label="چک در راه" value={<Money value={pending} className={cx(pending > 0 && 'text-warn')} />} />
        </div>

        <Card className={cx('mt-4 p-1.5 transition-opacity', isFetching && 'opacity-60')}>
          {!page ? (
            <Skeleton className="m-2 h-40" />
          ) : page.items.length === 0 ? (
            <Empty icon={<Inbox className="size-7" />} title="در این ماه واریزی به این حساب ثبت نشده" />
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
              <Pressable
                onClick={() => setSheet('edit')}
                className="flex w-full items-center gap-3 rounded-2xl border border-line bg-surface-2/60 px-4 py-3.5 font-semibold"
              >
                <Pencil className="size-5" /> ویرایش حساب
              </Pressable>
              <Pressable
                onClick={() =>
                  save.mutate(
                    { id: account.id, data: { is_archived: !account.is_archived } },
                    {
                      onSuccess: () => {
                        toast.success(account.is_archived ? 'حساب فعال شد' : 'حساب بایگانی شد')
                        setSheet(null)
                      },
                    },
                  )
                }
                className="flex w-full items-center gap-3 rounded-2xl border border-line bg-surface-2/60 px-4 py-3.5 font-semibold"
              >
                {account.is_archived ? <ArchiveRestore className="size-5" /> : <Archive className="size-5" />}
                {account.is_archived ? 'خروج از بایگانی' : 'بایگانی (در فرم پرداخت نمایش داده نشود)'}
              </Pressable>
              <Pressable
                onClick={() => setSheet('delete')}
                className="flex w-full items-center gap-3 rounded-2xl border border-line bg-surface-2/60 px-4 py-3.5 font-semibold text-debt"
              >
                <Trash2 className="size-5" /> حذف حساب
              </Pressable>
            </div>
          </Sheet>
          <AccountFormSheet key={sheet === 'edit' ? 'edit' : 'idle'} open={sheet === 'edit'} account={account} onClose={() => setSheet(null)} />
          <ConfirmSheet
            open={sheet === 'delete'}
            onClose={() => setSheet(null)}
            loading={del.isPending}
            title="حذف این حساب؟"
            message="فقط حسابی که هیچ تراکنشی ندارد حذف می‌شود؛ در غیر این صورت آن را بایگانی کنید."
            onConfirm={() =>
              del.mutate(account.id, {
                onSuccess: () => {
                  toast.success('حساب حذف شد')
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
