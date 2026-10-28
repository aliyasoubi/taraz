import type { PatientDetail, Treatment } from '@/shared/api/types'
import { t } from '@/shared/lib/i18n'
import { Chip } from '@/shared/ui'
import type { CaseFilter } from '../ledger'

/**
 * Filter the history by treatment case: "All" plus one capsule per case. Tapping
 * the selected case again opens it for editing. Hidden for patients with no cases.
 */
export function CaseStrip({
  patient,
  selected,
  onSelect,
  onEdit,
}: {
  patient: PatientDetail
  selected: CaseFilter
  onSelect: (filter: CaseFilter) => void
  onEdit: (treatment: Treatment) => void
}) {
  if (patient.treatments.length === 0) return null
  return (
    <div className="mt-6">
      <div className="-mx-4 no-scrollbar flex gap-2 overflow-x-auto px-4">
        <Chip active={selected === 'all'} onClick={() => onSelect('all')}>
          {t('common.all')}
        </Chip>
        {patient.treatments.map((tr) => (
          <Chip
            key={tr.id}
            active={selected === tr.id}
            onClick={() => (selected === tr.id ? onEdit(tr) : onSelect(tr.id))}
          >
            {tr.title}
          </Chip>
        ))}
      </div>
      {selected !== 'all' && <p className="mt-2 px-4 text-[13px] text-ink-2">{t('patient.tapToEdit')}</p>}
    </div>
  )
}
