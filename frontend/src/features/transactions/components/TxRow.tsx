import { motion } from 'motion/react'
import { ArrowDownLeft, ArrowLeft, ArrowUpRight, BadgePercent, Clock3, Stethoscope, XCircle } from 'lucide-react'
import { formatJ, relativeDay } from '@/shared/lib/jalali'
import { METHOD_LABEL, TX_LABEL } from '@/shared/lib/labels'
import type { Transaction } from '@/shared/api/types'
import { useTransactionSheets } from '@/features/transactions/TransactionSheets'
import { cx } from '@/shared/lib/cx'
import { itemVariants, Money } from '@/shared/ui'
import { t } from '@/shared/lib/i18n'

export function txVisual(tx: Transaction) {
  if (tx.type === 'payment') {
    if (tx.method === 'cheque' && tx.cheque_status === 'pending')
      return { Icon: Clock3, tint: 'text-warn bg-warn/12', amount: 'text-warn', sign: '−' }
    if (tx.method === 'cheque' && tx.cheque_status === 'bounced')
      return { Icon: XCircle, tint: 'text-ink-3 bg-surface-2', amount: 'text-ink-3 line-through', sign: '' }
    return { Icon: ArrowDownLeft, tint: 'text-credit bg-credit/12', amount: 'text-credit', sign: '−' }
  }
  if (tx.type === 'charge') return { Icon: Stethoscope, tint: 'text-debt bg-debt/12', amount: 'text-ink', sign: '+' }
  if (tx.type === 'discount')
    return { Icon: BadgePercent, tint: 'text-info bg-info/12', amount: 'text-info', sign: '−' }
  return { Icon: ArrowUpRight, tint: 'text-brand bg-brand/12', amount: 'text-brand', sign: '+' }
}

export function txTitle(tx: Transaction): string {
  if (tx.type === 'charge') return tx.description || tx.treatment_title || TX_LABEL.charge
  if (tx.type === 'discount') return tx.description || TX_LABEL.discount
  if (tx.type === 'refund') return tx.description || t('txRow.refundToPatient')
  return tx.description || (tx.method === 'cheque' ? METHOD_LABEL.cheque : TX_LABEL.payment)
}

/** One ledger line, styled like a bank statement entry: who paid → where it landed. */
export function TxRow({
  tx,
  showPatient,
  runningBalance,
}: {
  tx: Transaction
  showPatient?: boolean
  runningBalance?: number
}) {
  const { openTransaction } = useTransactionSheets()
  const { Icon, tint, amount, sign } = txVisual(tx)
  const flow = tx.type === 'payment' || tx.type === 'refund'

  return (
    <motion.button
      type="button"
      variants={itemVariants}
      layout="position"
      whileTap={{ scale: 0.985 }}
      onClick={() => openTransaction(tx)}
      className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-start transition-colors active:bg-surface-2/70"
    >
      <div className={cx('grid size-11 shrink-0 place-items-center rounded-2xl', tint)}>
        <Icon className="size-5" strokeWidth={2.2} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1.5">
            <p className="truncate text-[15px] font-semibold text-ink">{showPatient ? tx.patient_name : txTitle(tx)}</p>
            {tx.treatment_title && !showPatient && tx.type !== 'charge' && (
              <span className="shrink-0 rounded-md bg-surface-2 px-1.5 py-px text-[10px] text-ink-3">
                {tx.treatment_title}
              </span>
            )}
          </div>
          <div className={cx('shrink-0 text-[15px] font-bold', amount)}>
            <span className="me-0.5 opacity-70">{sign}</span>
            <Money value={tx.amount} unit={false} />
          </div>
        </div>
        <div className="mt-1 flex items-center justify-between gap-3 text-[12px] text-ink-3">
          <div className="flex min-w-0 items-center gap-1">
            {flow ? (
              <>
                <span className="truncate">
                  {tx.type === 'refund'
                    ? (tx.account_title ?? t('common.account'))
                    : (tx.payer_name ?? t('common.self'))}
                </span>
                <ArrowLeft className="size-3 shrink-0 opacity-70" />
                <span className="truncate">
                  {tx.type === 'refund' ? t('common.patient') : (tx.account_title ?? t('common.unknownAccount'))}
                </span>
                {tx.method && <span className="shrink-0 opacity-70">· {METHOD_LABEL[tx.method]}</span>}
              </>
            ) : (
              <span className="truncate">
                {showPatient ? txTitle(tx) : (tx.treatment_title ?? formatJ(tx.occurred_on))}
              </span>
            )}
          </div>
          <span className="shrink-0 text-[11px]">
            {tx.method === 'cheque' && tx.cheque_due_on && tx.cheque_status === 'pending'
              ? t('txRow.due', { when: relativeDay(tx.cheque_due_on) })
              : relativeDay(tx.occurred_on)}
          </span>
        </div>
        {runningBalance !== undefined && (
          <p className="mt-0.5 text-[11px] text-ink-3">
            {t('txRow.balanceAfter')}{' '}
            <Money value={runningBalance} tone="auto" unit={false} className="font-semibold" />
          </p>
        )}
      </div>
    </motion.button>
  )
}
