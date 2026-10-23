import { Plus } from 'lucide-react'
import { useState } from 'react'
import { TreatmentFormSheet } from '@/features/patients/components/TreatmentFormSheet'
import type { PatientDetail } from '@/shared/api/types'
import { t } from '@/shared/lib/i18n'
import { Chip } from '@/shared/ui'
import { SectionLabel } from './SectionLabel'

/** Which treatment case the row belongs to (optional), with a shortcut to open a new one. */
export function CaseSection({
  patient,
  selectedId,
  onSelect,
}: {
  patient: PatientDetail
  selectedId: number | null
  onSelect: (id: number | null) => void
}) {
  const [creating, setCreating] = useState(false)
  return (
    <div>
      <SectionLabel hint={t('common.optional')}>{t('txForm.caseLabel')}</SectionLabel>
      <div className="-mx-5 no-scrollbar flex gap-2 overflow-x-auto px-5">
        <Chip active={selectedId === null} onClick={() => onSelect(null)}>
          {t('common.noCase')}
        </Chip>
        {patient.treatments.map((tr) => (
          <Chip key={tr.id} active={selectedId === tr.id} onClick={() => onSelect(tr.id)}>
            {tr.title}
          </Chip>
        ))}
        <Chip onClick={() => setCreating(true)} className="border-dashed text-brand">
          <Plus className="size-3.5" /> {t('common.newCase')}
        </Chip>
      </div>
      <TreatmentFormSheet
        key={creating ? 'open' : 'idle'}
        open={creating}
        onClose={() => setCreating(false)}
        patientId={patient.id}
        onSaved={(tr) => onSelect(tr.id)}
      />
    </div>
  )
}
