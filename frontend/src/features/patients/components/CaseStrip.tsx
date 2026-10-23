import { FolderPlus } from 'lucide-react'
import type { PatientDetail, Treatment } from '@/shared/api/types'
import { cx } from '@/shared/lib/cx'
import { faDigits } from '@/shared/lib/format'
import { t } from '@/shared/lib/i18n'
import { TREATMENT_LABEL } from '@/shared/lib/labels'
import { Badge, Money, Pressable } from '@/shared/ui'
import type { CaseFilter } from '../ledger'

/** "All" plus one tile per treatment case. Tapping the selected case again opens it for editing. */
export function CaseStrip({
  patient,
  selected,
  onSelect,
  onEdit,
  onAdd,
}: {
  patient: PatientDetail
  selected: CaseFilter
  onSelect: (filter: CaseFilter) => void
  onEdit: (treatment: Treatment) => void
  onAdd: () => void
}) {
  return (
    <>
      <div className="-mx-4 no-scrollbar flex gap-2 overflow-x-auto px-4 pb-1">
        <CaseTile
          active={selected === 'all'}
          title={t('common.all')}
          subtitle={t('common.txCount', { n: faDigits(patient.tx_count) })}
          balance={patient.balance}
          onClick={() => onSelect('all')}
        />
        {patient.treatments.map((tr) => (
          <CaseTile
            key={tr.id}
            active={selected === tr.id}
            title={tr.title}
            subtitle={[TREATMENT_LABEL[tr.kind], tr.doctor].filter(Boolean).join(' · ')}
            balance={tr.balance}
            done={tr.status === 'completed'}
            onClick={() => (selected === tr.id ? onEdit(tr) : onSelect(tr.id))}
          />
        ))}
        <Pressable
          onClick={onAdd}
          className="grid w-28 shrink-0 place-items-center rounded-3xl border border-dashed border-line-2 py-3 text-ink-3"
        >
          <span className="flex flex-col items-center gap-1 text-xs font-semibold">
            <FolderPlus className="size-5" /> {t('common.newCase')}
          </span>
        </Pressable>
      </div>
      {selected !== 'all' && <p className="mt-1 px-1 text-[11px] text-ink-3">{t('patient.tapToEdit')}</p>}
    </>
  )
}

function CaseTile({
  active,
  title,
  subtitle,
  balance,
  done,
  onClick,
}: {
  active: boolean
  title: string
  subtitle: string
  balance: number
  done?: boolean
  onClick: () => void
}) {
  return (
    <Pressable
      onClick={onClick}
      className={cx(
        'w-36 shrink-0 rounded-3xl border p-3 text-start transition-colors',
        active ? 'border-brand/50 bg-brand/12' : 'border-line bg-surface/70',
      )}
    >
      <div className="flex items-center gap-1.5">
        <p className="truncate text-[14px] font-bold">{title}</p>
        {done && <Badge tone="credit">{t('treatmentForm.completedBadge')}</Badge>}
      </div>
      <p className="mt-0.5 truncate text-[11px] text-ink-3">{subtitle || ' '}</p>
      <Money value={balance} tone="auto" compact className="mt-2 block text-[13px] font-bold" />
    </Pressable>
  )
}
