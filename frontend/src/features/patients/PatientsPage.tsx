import { AnimatePresence, motion } from 'motion/react'
import { ArrowDownUp, Search, UserPlus, Users, X } from 'lucide-react'
import { useDeferredValue, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import {
  Avatar,
  Badge,
  Chip,
  Empty,
  IconButton,
  itemVariants,
  listVariants,
  Money,
  PageHeader,
  Skeleton,
  TextInput,
} from '@/shared/ui'
import { PatientFormSheet } from '@/features/patients/components/PatientFormSheet'
import { balanceTone, faDigits, TONE_LABEL } from '@/shared/lib/format'
import { relativeDay } from '@/shared/lib/jalali'
import { usePatients, type PatientListParams } from '@/features/patients/api'
import { t } from '@/shared/lib/i18n'

const FILTERS: { value: NonNullable<PatientListParams['status']>; label: string }[] = [
  { value: 'all', label: t('common.all') },
  { value: 'debtor', label: t('tone.debt') },
  { value: 'creditor', label: t('tone.credit') },
  { value: 'settled', label: t('tone.settled') },
  { value: 'archived', label: t('common.archived') },
]
const SORTS: { value: NonNullable<PatientListParams['sort']>; label: string }[] = [
  { value: 'balance', label: t('patients.sortBalance') },
  { value: 'recent', label: t('patients.sortRecent') },
  { value: 'name', label: t('patients.sortName') },
]

export function PatientsPage() {
  const [q, setQ] = useState('')
  const [status, setStatus] = useState<NonNullable<PatientListParams['status']>>('all')
  const [sort, setSort] = useState<NonNullable<PatientListParams['sort']>>('balance')
  const [adding, setAdding] = useState(false)
  const navigate = useNavigate()
  const deferredQ = useDeferredValue(q)
  const { data, isLoading } = usePatients({ q: deferredQ, status, sort })

  const total = (data ?? []).reduce((s, p) => s + Math.max(0, p.balance), 0)

  return (
    <div>
      <PageHeader
        title={t('patients.title')}
        subtitle={data ? t('common.patientsCount', { n: faDigits(data.length) }) : undefined}
        actions={
          <IconButton onClick={() => setAdding(true)} aria-label={t('common.newPatient')} className="text-brand">
            <UserPlus className="size-5" />
          </IconButton>
        }
      />

      <div className="sticky top-[calc(max(env(safe-area-inset-top),12px)+48px)] z-20 bg-bg/80 px-4 pt-1 pb-3 backdrop-blur-xl">
        <div className="relative">
          <Search className="pointer-events-none absolute start-4 top-1/2 size-5 -translate-y-1/2 text-ink-3" />
          <TextInput
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t('patients.search')}
            className="ps-12 pe-10"
            type="search"
            enterKeyHint="search"
          />
          {q && (
            <button
              type="button"
              onClick={() => setQ('')}
              className="absolute end-3 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-full bg-surface text-ink-3"
              aria-label={t('common.clear')}
            >
              <X className="size-4" />
            </button>
          )}
        </div>
        <div className="-mx-4 mt-3 no-scrollbar flex gap-2 overflow-x-auto px-4">
          {FILTERS.map((f) => (
            <Chip key={f.value} active={status === f.value} onClick={() => setStatus(f.value)}>
              {f.label}
            </Chip>
          ))}
          <Chip
            onClick={() => setSort(SORTS[(SORTS.findIndex((s) => s.value === sort) + 1) % SORTS.length]!.value)}
            className="ms-auto"
          >
            <ArrowDownUp className="size-3.5" />
            {SORTS.find((s) => s.value === sort)?.label}
          </Chip>
        </div>
      </div>

      <div className="px-4">
        {status === 'debtor' && data && data.length > 0 && (
          <div className="mb-3 flex items-center justify-between rounded-2xl border border-debt/20 bg-debt/8 px-4 py-3 text-sm">
            <span className="text-ink-2">{t('patients.debtTotal')}</span>
            <Money value={total} tone="debt" className="font-bold" />
          </div>
        )}

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 7 }, (_, i) => (
              <Skeleton key={i} className="h-[68px]" />
            ))}
          </div>
        ) : !data?.length ? (
          <Empty
            icon={<Users className="size-7" />}
            title={q ? t('patients.notFound') : t('patients.empty')}
            hint={q ? t('patients.notFoundHint') : t('patients.emptyHint')}
          />
        ) : (
          <motion.ul variants={listVariants} initial="hidden" animate="show" className="space-y-2">
            <AnimatePresence initial={false}>
              {data.map((p) => (
                <motion.li key={p.id} variants={itemVariants} layout="position" exit={{ opacity: 0, scale: 0.97 }}>
                  <Link
                    to={`/patients/${p.id}`}
                    className="flex items-center gap-3 rounded-3xl border border-line bg-surface/70 p-3 backdrop-blur transition active:scale-[0.99]"
                  >
                    <Avatar name={p.name} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{p.name}</p>
                      <div className="mt-0.5 flex items-center gap-2 text-[12px] text-ink-3">
                        {p.last_activity ? (
                          <span>{relativeDay(p.last_activity)}</span>
                        ) : (
                          <span>{t('common.noTransactions')}</span>
                        )}
                        {p.pending_cheques > 0 && <Badge tone="warn">{t('common.pendingCheque')}</Badge>}
                      </div>
                    </div>
                    <div className="text-end">
                      <Money value={p.balance} tone="auto" className="text-[15px] font-bold" unit={false} />
                      <p className="text-[11px] text-ink-3">{TONE_LABEL[balanceTone(p.balance)]}</p>
                    </div>
                  </Link>
                </motion.li>
              ))}
            </AnimatePresence>
          </motion.ul>
        )}
      </div>

      <PatientFormSheet
        key={adding ? 'open' : 'closed'}
        open={adding}
        initialName={q}
        onClose={() => setAdding(false)}
        onSaved={(p) => navigate(`/patients/${p.id}`)}
      />
    </div>
  )
}
