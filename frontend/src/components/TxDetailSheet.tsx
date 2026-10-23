import { motion } from 'motion/react'
import { Ban, CheckCircle2, Copy, Pencil, RotateCcw, Trash2, UserRound } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { faDigits, formatMoney, UNIT_LABEL } from '@/lib/format'
import { formatJ, relativeDay, weekdayName } from '@/lib/jalali'
import { CHEQUE_LABEL, METHOD_LABEL, TX_LABEL } from '@/lib/labels'
import { useAccounts, useDeleteTransaction, useSaveTransaction } from '@/lib/queries'
import { usePrefs } from '@/lib/settings'
import type { ChequeStatus, Transaction } from '@/lib/types'
import { AccountCard } from './AccountCard'
import { Avatar } from './Avatar'
import { ConfirmSheet } from './ConfirmSheet'
import { errorMessage } from './forms'
import { Money } from './Money'
import { Sheet } from './Sheet'
import { txVisual } from './TxRow'
import { Badge, Button, cx, Pressable } from './ui'

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 text-sm">
      <span className="shrink-0 text-ink-3">{label}</span>
      <span className="min-w-0 text-end font-medium text-ink">{children}</span>
    </div>
  )
}

/** Payer → account, with a dot travelling along the line like money in transit. */
function TransferFlow({ tx }: { tx: Transaction }) {
  const accounts = useAccounts().data ?? []
  const account = accounts.find((a) => a.id === tx.account_id)
  const payer = tx.payer_name ?? tx.patient_name
  return (
    <div className="flex items-center gap-2">
      <div className="flex w-24 shrink-0 flex-col items-center text-center">
        <Avatar name={payer} size={48} />
        <p className="mt-2 line-clamp-2 text-[13px] font-semibold leading-5">{payer}</p>
        <p className="text-[11px] text-ink-3">{tx.payer_name ? 'پرداخت‌کننده' : 'خود بیمار'}</p>
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
            حساب مشخص نشده
          </div>
        )}
        <p className="mt-2 text-[11px] text-ink-3">مقصد</p>
      </div>
    </div>
  )
}

function receiptText(tx: Transaction, unit: 'rial' | 'toman'): string {
  const lines = [
    `رسید ${TX_LABEL[tx.type]}`,
    `بیمار: ${tx.patient_name}`,
    `مبلغ: ${formatMoney(tx.amount, unit)} ${UNIT_LABEL[unit]}`,
  ]
  if (tx.type === 'payment') {
    lines.push(`پرداخت‌کننده: ${tx.payer_name ?? tx.patient_name}`)
    if (tx.account_title) lines.push(`واریز به: ${tx.account_title}${tx.account_bank ? ` (${tx.account_bank})` : ''}`)
  }
  if (tx.method) lines.push(`روش: ${METHOD_LABEL[tx.method]}`)
  lines.push(`تاریخ: ${formatJ(tx.occurred_on)}`)
  if (tx.cheque_due_on) lines.push(`سررسید چک: ${formatJ(tx.cheque_due_on)}`)
  if (tx.reference) lines.push(`پیگیری: ${faDigits(tx.reference)}`)
  if (tx.description) lines.push(`توضیحات: ${tx.description}`)
  return lines.join('\n')
}

export function TxDetailSheet({
  tx: initial,
  onClose,
  onEdit,
}: {
  tx: Transaction | null
  onClose: () => void
  onEdit: (tx: Transaction) => void
}) {
  // Keep showing the last transaction while the sheet animates out, and the
  // server's copy once a cheque status changes.
  const [last, setLast] = useState(initial)
  const [updated, setUpdated] = useState<Transaction | null>(null)
  if (initial && initial !== last) {
    setLast(initial)
    setUpdated(null)
  }
  const tx = updated ?? last
  const [confirm, setConfirm] = useState(false)
  const { unit } = usePrefs()
  const navigate = useNavigate()
  const save = useSaveTransaction()
  const del = useDeleteTransaction()

  if (!tx) return <Sheet open={false} onClose={onClose}>{null}</Sheet>

  const { Icon, tint } = txVisual(tx)
  const isCheque = tx.method === 'cheque' && tx.type === 'payment'

  const setCheque = (status: ChequeStatus) =>
    save.mutate(
      { id: tx.id, data: { cheque_status: status } },
      {
        onSuccess: (fresh) => {
          setUpdated(fresh)
          toast.success(status === 'cleared' ? 'چک وصول شد و از بدهی کم شد' : CHEQUE_LABEL[status])
        },
        onError: (e) => toast.error(errorMessage(e)),
      },
    )

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(receiptText(tx, unit))
      toast.success('رسید کپی شد')
    } catch {
      toast.error('کپی ممکن نشد')
    }
  }

  return (
    <>
      <Sheet open={Boolean(initial)} onClose={onClose}>
        <div className="flex flex-col items-center pb-1 pt-1 text-center">
          <motion.div
            initial={{ scale: 0.4, rotate: -20, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 16 }}
            className={cx('relative grid size-16 place-items-center rounded-[22px]', tint)}
          >
            <motion.span
              className="absolute inset-0 rounded-[22px] border-2 border-current"
              initial={{ scale: 1, opacity: 0.6 }}
              animate={{ scale: 1.5, opacity: 0 }}
              transition={{ duration: 1.2, repeat: 2 }}
            />
            <Icon className="size-8" strokeWidth={2.2} />
          </motion.div>
          <div className="mt-3 flex items-center gap-2">
            <span className="text-sm font-semibold text-ink-2">{TX_LABEL[tx.type]}</span>
            {isCheque && tx.cheque_status && (
              <Badge tone={tx.cheque_status === 'pending' ? 'warn' : tx.cheque_status === 'cleared' ? 'credit' : 'debt'}>
                {CHEQUE_LABEL[tx.cheque_status]}
              </Badge>
            )}
          </div>
          <Money value={tx.amount} className="mt-1 text-[34px] font-extrabold tracking-tight" />
          <p className="mt-1 text-[13px] text-ink-3">
            {weekdayName(tx.occurred_on)} {formatJ(tx.occurred_on)}
          </p>
        </div>

        <div className="receipt-edge mt-5 rounded-b-3xl bg-surface-2/70 px-4 pb-3 pt-6">
          {tx.type === 'payment' && (
            <div className="mb-3 border-b border-dashed border-line-2 pb-4">
              <TransferFlow tx={tx} />
            </div>
          )}
          <div className="divide-y divide-line">
            <Row label="بیمار">
              <button
                type="button"
                className="inline-flex items-center gap-1 text-brand"
                onClick={() => {
                  onClose()
                  navigate(`/patients/${tx.patient_id}`)
                }}
              >
                <UserRound className="size-3.5" /> {tx.patient_name}
              </button>
            </Row>
            {tx.treatment_title && <Row label="پرونده">{tx.treatment_title}</Row>}
            {tx.type === 'refund' && tx.account_title && <Row label="از حساب">{tx.account_title}</Row>}
            {tx.method && <Row label="روش">{METHOD_LABEL[tx.method]}</Row>}
            {tx.cheque_due_on && (
              <Row label="سررسید چک">
                {formatJ(tx.cheque_due_on)} <span className="text-ink-3">({relativeDay(tx.cheque_due_on)})</span>
              </Row>
            )}
            {tx.reference && (
              <Row label={isCheque ? 'شماره چک' : 'شماره پیگیری'}>
                <span dir="ltr">{faDigits(tx.reference)}</span>
              </Row>
            )}
            {tx.description && <Row label="توضیحات">{tx.description}</Row>}
            <Row label="وضعیت در حساب">
              {tx.counts ? (
                <span className="text-credit">اعمال شده</span>
              ) : (
                <span className="text-warn">هنوز از بدهی کم نشده</span>
              )}
            </Row>
          </div>
        </div>

        {isCheque && (
          <div className="mt-4 grid grid-cols-2 gap-3">
            {tx.cheque_status === 'pending' ? (
              <>
                <Button
                  className="bg-credit text-white shadow-none [background-image:none]"
                  onClick={() => setCheque('cleared')}
                  loading={save.isPending}
                >
                  <CheckCircle2 className="size-5" /> وصول شد
                </Button>
                <Button variant="danger" onClick={() => setCheque('bounced')} disabled={save.isPending}>
                  <Ban className="size-5" /> برگشت خورد
                </Button>
              </>
            ) : (
              <Button variant="secondary" className="col-span-2" onClick={() => setCheque('pending')} loading={save.isPending}>
                <RotateCcw className="size-4" /> بازگرداندن به «در انتظار وصول»
              </Button>
            )}
          </div>
        )}

        <div className="mt-4 grid grid-cols-3 gap-2">
          <ActionTile icon={<Pencil className="size-5" />} label="ویرایش" onClick={() => onEdit(tx)} />
          <ActionTile icon={<Copy className="size-5" />} label="کپی رسید" onClick={copy} />
          <ActionTile icon={<Trash2 className="size-5" />} label="حذف" danger onClick={() => setConfirm(true)} />
        </div>
      </Sheet>

      <ConfirmSheet
        open={confirm}
        onClose={() => setConfirm(false)}
        loading={del.isPending}
        title="حذف این تراکنش؟"
        message="مانده بیمار و گزارش‌ها دوباره محاسبه می‌شوند. این کار برگشت‌پذیر نیست."
        onConfirm={() =>
          del.mutate(tx.id, {
            onSuccess: () => {
              toast.success('تراکنش حذف شد')
              setConfirm(false)
              onClose()
            },
            onError: (e) => toast.error(errorMessage(e)),
          })
        }
      />
    </>
  )
}

function ActionTile({ icon, label, onClick, danger }: { icon: ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <Pressable
      onClick={onClick}
      className={cx(
        'flex flex-col items-center gap-1.5 rounded-2xl border border-line bg-surface-2/60 py-3 text-xs font-semibold',
        danger ? 'text-debt' : 'text-ink-2',
      )}
    >
      {icon}
      {label}
    </Pressable>
  )
}
