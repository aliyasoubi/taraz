import { motion } from 'motion/react'
import { CalendarClock, ChevronLeft } from 'lucide-react'
import { Link } from 'react-router'
import type { Dashboard } from '@/shared/api/types'
import { faDigits } from '@/shared/lib/format'
import { t } from '@/shared/lib/i18n'
import { relativeDay } from '@/shared/lib/jalali'
import { CompactMoney } from '@/shared/ui'

/** Cheques received but not yet cleared, linking to the cheques screen. */
export function ChequesBanner({ data }: { data: Dashboard }) {
  if (data.pending_cheques_count === 0) return null
  return (
    <Link to="/cheques">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mt-4 flex items-center gap-3 rounded-3xl border border-warn/25 bg-warn/8 p-4"
      >
        <div className="grid size-11 place-items-center rounded-2xl bg-warn/15 text-warn">
          <CalendarClock className="size-5" />
        </div>
        <div className="flex-1">
          <p className="font-semibold">{t('home.pendingCheques', { n: faDigits(data.pending_cheques_count) })}</p>
          <p className="text-xs text-ink-3">
            {data.upcoming_cheques[0]?.cheque_due_on
              ? t('home.nearestDue', { when: relativeDay(data.upcoming_cheques[0].cheque_due_on) })
              : t('home.notClearedYet')}
          </p>
        </div>
        <CompactMoney value={data.pending_cheques_total} className="text-sm font-bold text-warn" />
        <ChevronLeft className="size-5 text-ink-3" />
      </motion.div>
    </Link>
  )
}
