import { motion } from 'motion/react'
import { Phone } from 'lucide-react'
import type { BalanceFields, PatientDetail } from '@/shared/api/types'
import { cx } from '@/shared/lib/cx'
import { balanceTone, faDigits, TONE_LABEL } from '@/shared/lib/format'
import { t } from '@/shared/lib/i18n'
import { AnimatedMoney, Avatar, Badge, Money } from '@/shared/ui'

const TONE_CARD = {
  debt: 'border-debt/25 bg-gradient-to-br from-debt/18 via-surface to-surface',
  credit: 'border-credit/25 bg-gradient-to-br from-credit/18 via-surface to-surface',
  settled: 'border-line bg-gradient-to-br from-brand/14 via-surface to-surface',
} as const

/** The patient's balance card — for the whole patient, or one treatment case (`view`). */
export function PatientHero({
  patient,
  view,
  caseTitle,
}: {
  patient: PatientDetail
  view: BalanceFields
  caseTitle?: string
}) {
  const tone = balanceTone(patient.balance)
  const paidShare = view.charged > 0 ? Math.min(1, (view.paid + view.discounted) / view.charged) : 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      className={cx('relative overflow-hidden rounded-[30px] border p-5', TONE_CARD[tone])}
    >
      <div className="flex items-center gap-3">
        <Avatar name={patient.name} size={54} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Badge tone={tone === 'settled' ? 'neutral' : tone}>{TONE_LABEL[tone]}</Badge>
            {patient.is_archived && <Badge>{t('common.archived')}</Badge>}
          </div>
          {patient.phone && (
            <a
              href={`tel:${patient.phone}`}
              className="mt-1 inline-flex items-center gap-1 text-[13px] text-ink-3"
              dir="ltr"
            >
              <Phone className="size-3.5" /> {faDigits(patient.phone)}
            </a>
          )}
        </div>
      </div>

      <p className="mt-5 text-[13px] text-ink-3">
        {caseTitle ? t('patient.caseBalance', { title: caseTitle }) : t('patient.balance')}
      </p>
      <AnimatedMoney
        value={Math.abs(view.balance)}
        maxSize={38}
        className={cx(
          'leading-tight font-black tracking-tight',
          view.balance > 0 ? 'text-debt' : view.balance < 0 ? 'text-credit' : 'text-ink',
        )}
      />
      {view.pending_cheques > 0 && (
        <p className="mt-1 text-[12px] text-warn">
          <Money value={view.pending_cheques} className="font-semibold" /> {t('patient.pendingAfter')}{' '}
          <Money value={view.balance - view.pending_cheques} tone="auto" className="font-semibold" />
        </p>
      )}

      <div className="mt-4">
        <div className="h-2 overflow-hidden rounded-full bg-line">
          <motion.div
            className="h-full rounded-full bg-gradient-to-l from-credit to-info"
            initial={{ width: 0 }}
            animate={{ width: `${paidShare * 100}%` }}
            transition={{ type: 'spring', stiffness: 80, damping: 20, delay: 0.2 }}
          />
        </div>
        <div className="mt-2 flex justify-between text-[12px] text-ink-3">
          <span>
            {t('patient.paid')} <Money value={view.paid} className="font-semibold text-ink-2" unit={false} />
          </span>
          <span>
            {t('patient.charged')} <Money value={view.charged} className="font-semibold text-ink-2" unit={false} />
          </span>
        </div>
      </div>
    </motion.div>
  )
}
