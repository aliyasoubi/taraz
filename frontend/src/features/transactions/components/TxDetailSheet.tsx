import { Ban, CheckCircle2, Copy, Pencil, RotateCcw, Trash2 } from 'lucide-react'
import { useState } from 'react'
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
import { Badge, ConfirmSheet, ListIcon, ListRow, ListSection, Money, Sheet } from '@/shared/ui'
import { receiptText } from '../receipt'
import { TransferFlow } from './TransferFlow'
import { txVisual } from './TxRow'

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
        <div className="flex flex-col items-center pt-1 text-center">
          <div className={cx('grid size-14 place-items-center rounded-full', tint)}>
            <Icon className="size-7" strokeWidth={2.2} />
          </div>
          <div className="mt-3 flex items-center gap-2">
            <span className="text-[15px] text-ink-2">{TX_LABEL[tx.type]}</span>
            {isCheque && tx.cheque_status && (
              <Badge
                tone={tx.cheque_status === 'pending' ? 'warn' : tx.cheque_status === 'cleared' ? 'credit' : 'debt'}
              >
                {CHEQUE_LABEL[tx.cheque_status]}
              </Badge>
            )}
          </div>
          <Money value={tx.amount} className="mt-1 text-[34px] font-bold tracking-tight" />
          <p className="mt-0.5 text-[13px] text-ink-2">
            {weekdayName(tx.occurred_on)} {formatJ(tx.occurred_on)}
          </p>
        </div>

        {tx.type === 'payment' && (
          <div className="mt-5 rounded-[12px] bg-surface p-4">
            <TransferFlow tx={tx} />
          </div>
        )}

        <ListSection className="mt-4">
          <ListRow
            title={t('common.patient')}
            value={<span className="text-brand">{tx.patient_name}</span>}
            chevron
            onClick={() => {
              onClose()
              navigate(`/patients/${tx.patient_id}`)
            }}
          />
          {tx.treatment_title && <ListRow title={t('common.case')} value={tx.treatment_title} />}
          {tx.doctor && <ListRow title={t('txForm.doctor')} value={tx.doctor} />}
          {tx.type === 'refund' && tx.account_title && (
            <ListRow title={t('txDetail.fromAccount')} value={tx.account_title} />
          )}
          {tx.method && <ListRow title={t('common.method')} value={METHOD_LABEL[tx.method]} />}
          {tx.cheque_due_on && (
            <ListRow
              title={t('common.chequeDue')}
              value={`${formatJ(tx.cheque_due_on)} (${relativeDay(tx.cheque_due_on)})`}
            />
          )}
          {tx.reference && (
            <ListRow
              title={isCheque ? t('common.chequeNumber') : t('common.reference')}
              value={<span dir="ltr">{faDigits(tx.reference)}</span>}
            />
          )}
          {tx.description && <ListRow title={t('common.service')} subtitle={tx.description} />}
          <ListRow
            title={t('txDetail.ledgerStatus')}
            value={
              tx.counts ? (
                <span className="text-credit">{t('txDetail.applied')}</span>
              ) : (
                <span className="text-warn">{t('txDetail.notApplied')}</span>
              )
            }
          />
        </ListSection>

        {isCheque && (
          <ListSection className="mt-6">
            {tx.cheque_status === 'pending' ? (
              <>
                <ListRow
                  icon={
                    <ListIcon tone="credit">
                      <CheckCircle2 />
                    </ListIcon>
                  }
                  title={t('txDetail.markCleared')}
                  onClick={() => !save.isPending && setCheque('cleared')}
                />
                <ListRow
                  icon={
                    <ListIcon tone="debt">
                      <Ban />
                    </ListIcon>
                  }
                  title={t('txDetail.markBounced')}
                  onClick={() => !save.isPending && setCheque('bounced')}
                />
              </>
            ) : (
              <ListRow
                icon={
                  <ListIcon tone="gray">
                    <RotateCcw />
                  </ListIcon>
                }
                title={t('txDetail.markPending')}
                onClick={() => !save.isPending && setCheque('pending')}
              />
            )}
          </ListSection>
        )}

        <ListSection className="mt-6">
          <ListRow
            icon={
              <ListIcon tone="gray">
                <Pencil />
              </ListIcon>
            }
            title={t('common.edit')}
            onClick={() => onEdit(tx)}
          />
          <ListRow
            icon={
              <ListIcon tone="gray">
                <Copy />
              </ListIcon>
            }
            title={t('txDetail.copyReceipt')}
            onClick={copy}
          />
        </ListSection>
        <ListSection className="mt-6">
          <ListRow
            icon={
              <ListIcon tone="debt">
                <Trash2 />
              </ListIcon>
            }
            title={t('common.delete')}
            destructive
            onClick={() => setConfirm(true)}
          />
        </ListSection>
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
