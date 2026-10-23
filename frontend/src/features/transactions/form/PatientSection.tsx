import { motion } from 'motion/react'
import { Search, UserPlus, X } from 'lucide-react'
import { useState } from 'react'
import { usePatients } from '@/features/patients/api'
import { PatientFormSheet } from '@/features/patients/components/PatientFormSheet'
import type { PatientDetail } from '@/shared/api/types'
import { t } from '@/shared/lib/i18n'
import { Avatar, Money, Pressable, TextInput } from '@/shared/ui'
import { SectionLabel } from './SectionLabel'

/** The chosen patient, or a search to choose (or create) one. */
export function PatientSection({
  patientId,
  patient,
  locked,
  onPick,
  onClear,
}: {
  patientId: number | null
  patient: PatientDetail | undefined
  locked: boolean
  onPick: (id: number) => void
  onClear: () => void
}) {
  return (
    <div>
      <SectionLabel>{t('common.patient')}</SectionLabel>
      {patientId && patient ? (
        <motion.div layout className="flex items-center gap-3 rounded-2xl border border-line bg-surface-2/60 p-3">
          <Avatar name={patient.name} size={42} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{patient.name}</p>
            <p className="text-xs text-ink-3">
              {t('txForm.currentBalance')} <Money value={patient.balance} tone="auto" className="font-semibold" />
            </p>
          </div>
          {!locked && (
            <button
              type="button"
              onClick={onClear}
              className="grid size-8 place-items-center rounded-full bg-surface text-ink-3"
              aria-label={t('txForm.changePatient')}
            >
              <X className="size-4" />
            </button>
          )}
        </motion.div>
      ) : patientId ? (
        <div className="shimmer h-[68px] rounded-2xl" />
      ) : (
        <PatientPicker onPick={onPick} />
      )}
    </div>
  )
}

function PatientPicker({ onPick }: { onPick: (id: number) => void }) {
  const [q, setQ] = useState('')
  const [creating, setCreating] = useState(false)
  const { data = [], isFetching } = usePatients({ q, sort: q ? 'balance' : 'recent' })
  return (
    <div>
      <div className="relative">
        <Search className="pointer-events-none absolute start-4 top-1/2 size-5 -translate-y-1/2 text-ink-3" />
        <TextInput
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t('txForm.searchPatient')}
          className="ps-12"
          autoFocus
        />
      </div>
      <div className="mt-2 max-h-64 space-y-1 overflow-y-auto">
        {data.slice(0, 30).map((p) => (
          <Pressable
            key={p.id}
            onClick={() => onPick(p.id)}
            className="flex w-full items-center gap-3 rounded-2xl px-2 py-2 text-start active:bg-surface-2"
          >
            <Avatar name={p.name} size={36} />
            <span className="flex-1 truncate font-medium">{p.name}</span>
            {p.balance !== 0 && <Money value={p.balance} tone="auto" compact className="text-xs font-semibold" />}
          </Pressable>
        ))}
        {!isFetching && data.length === 0 && (
          <p className="py-3 text-center text-sm text-ink-3">{t('txForm.noPatientFound')}</p>
        )}
      </div>
      <Pressable
        onClick={() => setCreating(true)}
        className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-line-2 py-3 text-sm font-semibold text-brand"
      >
        <UserPlus className="size-4" />
        {q.trim() ? t('txForm.addNamed', { name: q.trim() }) : t('common.newPatient')}
      </Pressable>
      <PatientFormSheet
        key={creating ? 'new' : 'idle'}
        open={creating}
        initialName={q.trim()}
        onClose={() => setCreating(false)}
        onSaved={(p) => onPick(p.id)}
      />
    </div>
  )
}
