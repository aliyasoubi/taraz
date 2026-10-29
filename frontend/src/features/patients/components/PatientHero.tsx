import { motion } from 'motion/react'
import type { BalanceFields, PatientDetail } from '@/shared/api/types'
import { cx } from '@/shared/lib/cx'
import { faDigits } from '@/shared/lib/format'
import { t } from '@/shared/lib/i18n'
import { AnimatedMoney, Avatar, Money, smooth } from '@/shared/ui'

/**
 * The top of a patient's screen, laid out like a contact card: monogram, name,
 * phone, then what they owe — for the whole patient, or one treatment case (`view`).
 */
export function PatientHero({
  patient,
  view,
  caseTitle,
}: {
  patient: PatientDetail
  view: BalanceFields
  caseTitle?: string
}) {
  const paidShare = view.charged > 0 ? Math.min(1, (view.paid + view.discounted) / view.charged) : 0
  const label =
    view.balance > 0 ? t('patient.owes') : view.balance < 0 ? t('patient.hasCredit') : t('patient.settledUp')

  return (
    <>
      <header className="flex flex-col items-center text-center">
        <Avatar name={patient.name} size={84} />
        <h1 className="mt-3 text-[28px] leading-tight font-bold">{patient.name}</h1>
        {patient.phone && (
          <a href={`tel:${patient.phone}`} className="mt-1 text-[15px] text-brand" dir="ltr">
            {faDigits(patient.phone)}
          </a>
        )}
        {patient.is_archived && <p className="mt-1 text-[13px] text-ink-2">{t('common.archived')}</p>}
      </header>

      <div className="mt-6 rounded-[12px] bg-surface px-4 pt-4 pb-4 text-center">
        <p className="text-[13px] text-ink-2">{caseTitle ? t('patient.caseBalance', { title: caseTitle }) : label}</p>
        <AnimatedMoney
          value={Math.abs(view.balance)}
          maxSize={40}
          className={cx(
            'mt-0.5 font-bold tracking-tight',
            view.balance > 0 ? 'text-debt' : view.balance < 0 ? 'text-credit' : 'text-ink',
          )}
        />
        {view.pending_cheques > 0 && (
          <p className="mt-1 text-[13px] text-warn">
            <Money value={view.pending_cheques} /> {t('patient.pendingAfter')}{' '}
            <Money value={view.balance - view.pending_cheques} />
          </p>
        )}
        {view.charged > 0 && (
          <div className="mt-4">
            <div className="h-1 overflow-hidden rounded-full bg-fill">
              <motion.div
                className="h-full rounded-full bg-credit"
                initial={{ width: 0 }}
                animate={{ width: `${paidShare * 100}%` }}
                transition={{ ...smooth, delay: 0.15 }}
              />
            </div>
            <p className="mt-2 text-[13px] text-ink-2">
              {t('patient.paid')} <Money value={view.paid + view.discounted} unit={false} className="text-ink" />{' '}
              {t('patient.of')} <Money value={view.charged} unit={false} className="text-ink" />
            </p>
          </div>
        )}
      </div>
    </>
  )
}
