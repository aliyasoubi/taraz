import { ArrowDownLeft, ArrowLeft, ArrowUpRight, BadgePercent, Clock3, Stethoscope, XCircle } from 'lucide-react'
import { formatJ, relativeDay } from '@/shared/lib/jalali'
import { METHOD_LABEL, TX_LABEL } from '@/shared/lib/labels'
import type { Transaction } from '@/shared/api/types'
import { useTransactionSheets } from '@/features/transactions/TransactionSheets'
import { cx } from '@/shared/lib/cx'
import { Money } from '@/shared/ui'
import { t } from '@/shared/lib/i18n'

export function txVisual(tx: Transaction) {
  if (tx.type === 'payment') {
    if (tx.method === 'cheque' && tx.cheque_status === 'pending')
      return { Icon: Clock3, tint: 'text-warn bg-warn/15', amount: 'text-warn', sign: '−' }
    if (tx.method === 'cheque' && tx.cheque_status === 'bounced')
      return { Icon: XCircle, tint: 'text-ink-2 bg-fill', amount: 'text-ink-3 line-through', sign: '' }
    return { Icon: ArrowDownLeft, tint: 'text-credit bg-credit/15', amount: 'text-credit', sign: '−' }
  }
  if (tx.type === 'charge') return { Icon: Stethoscope, tint: 'text-debt bg-debt/15', amount: 'text-ink', sign: '+' }
  if (tx.type === 'discount')
    return { Icon: BadgePercent, tint: 'text-info bg-info/15', amount: 'text-info', sign: '−' }
  return { Icon: ArrowUpRight, tint: 'text-brand bg-brand/15', amount: 'text-brand', sign: '+' }
}

export function txTitle(tx: Transaction): string {
  if (tx.type === 'charge') return tx.description || tx.treatment_title || TX_LABEL.charge
  if (tx.type === 'discount') return tx.description || TX_LABEL.discount
  if (tx.type === 'refund') return tx.description || t('txRow.refundToPatient')
  return tx.description || (tx.method === 'cheque' ? METHOD_LABEL.cheque : TX_LABEL.payment)
}

/** One ledger line as a list row, like a Wallet transaction: what, who paid → where it landed, how much, when. */
export function TxRow({
  tx,
  showPatient,
  balanceAfter,
}: {
  tx: Transaction
  showPatient?: boolean
  /** Shown instead of the date: what the patient owed right after this row, as in the month sheet. */
  balanceAfter?: number
}) {
  const { openTransaction } = useTransactionSheets()
  const { Icon, tint, amount, sign } = txVisual(tx)
  const flow = tx.type === 'payment' || tx.type === 'refund'
  const pendingDue = tx.method === 'cheque' && tx.cheque_due_on && tx.cheque_status === 'pending'

  return (
    <button
      type="button"
      onClick={() => openTransaction(tx)}
      className="group flex w-full items-center gap-3 ps-4 text-start transition-colors duration-300 active:bg-highlight active:duration-0"
    >
      <span className={cx('grid size-9 shrink-0 place-items-center rounded-full', tint)}>
        <Icon className="size-[18px]" strokeWidth={2.2} />
      </span>
      <span className="relative flex min-w-0 flex-1 items-center gap-3 py-2.5 pe-4 after:absolute after:inset-x-0 after:bottom-0 after:h-px after:origin-bottom after:scale-y-50 after:bg-line-2 group-last:after:hidden">
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[17px] leading-[22px]">
            {showPatient ? tx.patient_name : txTitle(tx)}
          </span>
          <span className="mt-0.5 flex min-w-0 items-center gap-1 text-[13px] leading-[18px] text-ink-2">
            {flow ? (
              <>
                <span className="max-w-[55%] shrink-0 truncate">
                  {tx.type === 'refund'
                    ? (tx.account_title ?? t('common.account'))
                    : (tx.payer_name ?? t('common.self'))}
                </span>
                <ArrowLeft className="size-3 shrink-0" />
                <span className="truncate">
                  {tx.type === 'refund' ? t('common.patient') : (tx.account_title ?? t('common.unknownAccount'))}
                </span>
              </>
            ) : (
              <span className="truncate">
                {showPatient
                  ? [txTitle(tx), tx.doctor].filter(Boolean).join(' · ')
                  : [tx.treatment_title, tx.doctor].filter(Boolean).join(' · ') || formatJ(tx.occurred_on)}
              </span>
            )}
          </span>
        </span>
        <span className="shrink-0 text-end">
          <span className={cx('block text-[17px] leading-[22px]', amount)}>
            <span className="me-0.5">{sign}</span>
            <Money value={tx.amount} unit={false} />
          </span>
          {balanceAfter !== undefined ? (
            <span className="mt-0.5 block text-[13px] leading-[18px] text-ink-2">
              {t('sheet.balanceAfter')} <Money value={balanceAfter} tone="auto" unit={false} />
            </span>
          ) : (
            <span className={cx('mt-0.5 block text-[13px] leading-[18px]', pendingDue ? 'text-warn' : 'text-ink-2')}>
              {pendingDue ? t('txRow.due', { when: relativeDay(tx.cheque_due_on!) }) : relativeDay(tx.occurred_on)}
            </span>
          )}
        </span>
      </span>
    </button>
  )
}
