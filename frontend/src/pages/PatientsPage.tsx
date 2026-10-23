import { AnimatePresence, motion } from 'motion/react'
import { ArrowDownUp, Search, UserPlus, Users, X } from 'lucide-react'
import { useDeferredValue, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { Avatar } from '@/components/Avatar'
import { PatientFormSheet } from '@/components/forms'
import { Money } from '@/components/Money'
import { PageHeader } from '@/components/PageHeader'
import { Badge, Chip, Empty, IconButton, itemVariants, listVariants, Skeleton, TextInput } from '@/components/ui'
import { faDigits } from '@/lib/format'
import { relativeDay } from '@/lib/jalali'
import { usePatients, type PatientListParams } from '@/lib/queries'

const FILTERS: { value: NonNullable<PatientListParams['status']>; label: string }[] = [
  { value: 'all', label: 'همه' },
  { value: 'debtor', label: 'بدهکار' },
  { value: 'creditor', label: 'بستانکار' },
  { value: 'settled', label: 'تسویه' },
  { value: 'archived', label: 'بایگانی' },
]
const SORTS: { value: NonNullable<PatientListParams['sort']>; label: string }[] = [
  { value: 'balance', label: 'بیشترین بدهی' },
  { value: 'recent', label: 'آخرین فعالیت' },
  { value: 'name', label: 'الفبا' },
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
        title="بیماران"
        subtitle={data ? `${faDigits(data.length)} بیمار` : undefined}
        actions={
          <IconButton onClick={() => setAdding(true)} aria-label="بیمار جدید" className="text-brand">
            <UserPlus className="size-5" />
          </IconButton>
        }
      />

      <div className="sticky top-[calc(max(env(safe-area-inset-top),12px)+48px)] z-20 bg-bg/80 px-4 pb-3 pt-1 backdrop-blur-xl">
        <div className="relative">
          <Search className="pointer-events-none absolute start-4 top-1/2 size-5 -translate-y-1/2 text-ink-3" />
          <TextInput
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="جستجوی نام…"
            className="ps-12 pe-10"
            type="search"
            enterKeyHint="search"
          />
          {q && (
            <button
              type="button"
              onClick={() => setQ('')}
              className="absolute end-3 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-full bg-surface text-ink-3"
              aria-label="پاک کردن"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
        <div className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4">
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
            <span className="text-ink-2">جمع بدهی این فهرست</span>
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
            title={q ? 'بیماری با این نام پیدا نشد' : 'فهرست خالی است'}
            hint={q ? 'املای دیگری را امتحان کنید' : 'بیمار جدید را از دکمه بالای صفحه اضافه کنید'}
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
                        {p.last_activity ? <span>{relativeDay(p.last_activity)}</span> : <span>بدون تراکنش</span>}
                        {p.pending_cheques > 0 && <Badge tone="warn">چک در جریان</Badge>}
                      </div>
                    </div>
                    <div className="text-end">
                      <Money value={p.balance} tone="auto" className="text-[15px] font-bold" unit={false} />
                      <p className="text-[11px] text-ink-3">
                        {p.balance > 0 ? 'بدهکار' : p.balance < 0 ? 'بستانکار' : 'تسویه'}
                      </p>
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
