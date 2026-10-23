import { motion } from 'motion/react'
import { Ban, CheckCircle2, Copy, Pencil, RotateCcw, Trash2, UserRound } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { useDeleteTransaction, useSaveTransaction } from '@/features/transactions/api'
import type { ChequeStatus, Transaction } from '@/shared/api/types'
import { cx } from '@/shared/lib/cx'
import { errorMessage } from '@/shared/lib/errors'
import { faDigits } from '@/shared/lib/format'
import { t } from '@/shared/lib/i18n'
import { formatJ, relativeDay, weekdayName } from '@/shared/lib/jalali'
import { CHEQUE_LABEL, METHOD_LABEL, TX_LABEL } from '@/shared/lib/labels'
import { usePrefs } from '@/shared/lib/settings'
import { Badge, Button, ConfirmSheet, Money, Pressable, Sheet } from '@/shared/ui'
import { receiptText } from '../receipt'
import { TransferFlow } from './TransferFlow'
import { txVisual } from './TxRow'

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 text-sm">
      <span className="shrink-0 text-ink-3">{label}</span>
      <span className="min-w-0 text-end font-medium text-ink">{children}</span>
    </div>
  )
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

  if (!tx)
    return (
      <Sheet open={false} onClose={onClose}>
        {null}
      </Sheet>
    )

  const { Icon, tint } = txVisual(tx)
  const isCheque = tx.method === 'cheque' && tx.type === 'payment'

  const setCheque = (status: ChequeStatus) =>
    save.mutate(
      { id: tx.id, data: { cheque_status: status } },
      {
        onSuccess: (fresh) => {
          setUpdated(fresh)
          toast.success(status === 'cleared' ? t('txDetail.chequeCleared') : CHEQUE_LABEL[status])
        },
        onError: (e) => toast.error(errorMessage(e)),
      },
    )

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(receiptText(tx, unit))
      toast.success(t('txDetail.copied'))
    } catch {
      toast.error(t('txDetail.copyFailed'))
    }
  }

  return (
    <>
      <Sheet open={Boolean(initial)} onClose={onClose}>
        <div className="flex flex-col items-center pt-1 pb-1 text-center">
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
              <Badge
                tone={tx.cheque_status === 'pending' ? 'warn' : tx.cheque_status === 'cleared' ? 'credit' : 'debt'}
              >
                {CHEQUE_LABEL[tx.cheque_status]}
              </Badge>
            )}
          </div>
          <Money value={tx.amount} className="mt-1 text-[34px] font-extrabold tracking-tight" />
          <p className="mt-1 text-[13px] text-ink-3">
            {weekdayName(tx.occurred_on)} {formatJ(tx.occurred_on)}
          </p>
        </div>

        <div className="receipt-edge mt-5 rounded-b-3xl bg-surface-2/70 px-4 pt-6 pb-3">
          {tx.type === 'payment' && (
            <div className="mb-3 border-b border-dashed border-line-2 pb-4">
              <TransferFlow tx={tx} />
            </div>
          )}
          <div className="divide-y divide-line">
            <Row label={t('common.patient')}>
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
            {tx.treatment_title && <Row label={t('common.case')}>{tx.treatment_title}</Row>}
            {tx.type === 'refund' && tx.account_title && (
              <Row label={t('txDetail.fromAccount')}>{tx.account_title}</Row>
            )}
            {tx.method && <Row label={t('common.method')}>{METHOD_LABEL[tx.method]}</Row>}
            {tx.cheque_due_on && (
              <Row label={t('common.chequeDue')}>
                {formatJ(tx.cheque_due_on)} <span className="text-ink-3">({relativeDay(tx.cheque_due_on)})</span>
              </Row>
            )}
            {tx.reference && (
              <Row label={isCheque ? t('common.chequeNumber') : t('common.reference')}>
                <span dir="ltr">{faDigits(tx.reference)}</span>
              </Row>
            )}
            {tx.description && <Row label={t('common.description')}>{tx.description}</Row>}
            <Row label={t('txDetail.ledgerStatus')}>
              {tx.counts ? (
                <span className="text-credit">{t('txDetail.applied')}</span>
              ) : (
                <span className="text-warn">{t('txDetail.notApplied')}</span>
              )}
            </Row>
          </div>
        </div>

        {isCheque && (
          <div className="mt-4 grid grid-cols-2 gap-3">
            {tx.cheque_status === 'pending' ? (
              <>
                <Button
                  className="bg-credit [background-image:none] text-white shadow-none"
                  onClick={() => setCheque('cleared')}
                  loading={save.isPending}
                >
                  <CheckCircle2 className="size-5" /> {t('txDetail.markCleared')}
                </Button>
                <Button variant="danger" onClick={() => setCheque('bounced')} disabled={save.isPending}>
                  <Ban className="size-5" /> {t('txDetail.markBounced')}
                </Button>
              </>
            ) : (
              <Button
                variant="secondary"
                className="col-span-2"
                onClick={() => setCheque('pending')}
                loading={save.isPending}
              >
                <RotateCcw className="size-4" /> {t('txDetail.markPending')}
              </Button>
            )}
          </div>
        )}

        <div className="mt-4 grid grid-cols-3 gap-2">
          <ActionTile icon={<Pencil className="size-5" />} label={t('common.edit')} onClick={() => onEdit(tx)} />
          <ActionTile icon={<Copy className="size-5" />} label={t('txDetail.copyReceipt')} onClick={copy} />
          <ActionTile
            icon={<Trash2 className="size-5" />}
            label={t('common.delete')}
            danger
            onClick={() => setConfirm(true)}
          />
        </div>
      </Sheet>

      <ConfirmSheet
        open={confirm}
        onClose={() => setConfirm(false)}
        loading={del.isPending}
        title={t('txDetail.deleteTitle')}
        message={t('txDetail.deleteMessage')}
        onConfirm={() =>
          del.mutate(tx.id, {
            onSuccess: () => {
              toast.success(t('txDetail.deleted'))
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

function ActionTile({
  icon,
  label,
  onClick,
  danger,
}: {
  icon: ReactNode
  label: string
  onClick: () => void
  danger?: boolean
}) {
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
