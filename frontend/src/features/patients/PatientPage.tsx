import { Pencil } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useParams } from 'react-router'
import { useTransactionSheets } from '@/features/transactions/TransactionSheets'
import type { Treatment } from '@/shared/api/types'
import { t } from '@/shared/lib/i18n'
import { IconButton, PageHeader, SectionTitle, Skeleton } from '@/shared/ui'
import { usePatient, usePatientTransactions } from './api'
import { CaseStrip } from './components/CaseStrip'
import { LedgerTimeline } from './components/LedgerTimeline'
import { PatientFormSheet } from './components/PatientFormSheet'
import { PatientHero } from './components/PatientHero'
import { PatientMenuSheet } from './components/PatientMenuSheet'
import { QuickActions } from './components/QuickActions'
import { TreatmentFormSheet } from './components/TreatmentFormSheet'
import { buildLedger, type CaseFilter } from './ledger'

type OpenSheet =
  { kind: 'menu' } | { kind: 'edit' } | { kind: 'delete' } | { kind: 'case'; treatment?: Treatment } | null

export function PatientPage() {
  const id = Number(useParams().id)
  const { data: patient, isLoading } = usePatient(id)
  const { data: transactions } = usePatientTransactions(id)
  const { newTransaction } = useTransactionSheets()
  const [filter, setFilter] = useState<CaseFilter>('all')
  const [sheet, setSheet] = useState<OpenSheet>(null)
  const ledger = useMemo(() => buildLedger(transactions ?? [], filter), [transactions, filter])

  if (isLoading || !patient) {
    return (
      <div className="px-4 pt-safe">
        <Skeleton className="mt-16 h-56 rounded-[30px]" />
        <Skeleton className="mt-4 h-24" />
        <Skeleton className="mt-4 h-64" />
      </div>
    )
  }

  const selectedCase = filter === 'all' ? undefined : patient.treatments.find((tr) => tr.id === filter)
  const close = () => setSheet(null)
  const caseSheet = sheet?.kind === 'case' ? sheet : null

  return (
    <div>
      <PageHeader
        back
        title={patient.name}
        actions={
          <IconButton onClick={() => setSheet({ kind: 'menu' })} aria-label={t('common.options')}>
            <Pencil className="size-[18px]" />
          </IconButton>
        }
      />

      <div className="px-4">
        <PatientHero patient={patient} view={selectedCase ?? patient} caseTitle={selectedCase?.title} />
        <div className="mt-4">
          <QuickActions
            onAdd={(type) => newTransaction({ patientId: patient.id, treatmentId: selectedCase?.id, type })}
          />
        </div>

        <SectionTitle>{t('patient.cases')}</SectionTitle>
        <CaseStrip
          patient={patient}
          selected={filter}
          onSelect={setFilter}
          onEdit={(treatment) => setSheet({ kind: 'case', treatment })}
          onAdd={() => setSheet({ kind: 'case' })}
        />

        <SectionTitle>{t('patient.ledger')}</SectionTitle>
        {transactions ? <LedgerTimeline ledger={ledger} /> : <Skeleton className="h-48" />}
      </div>

      <PatientMenuSheet
        patient={patient}
        open={sheet?.kind === 'menu'}
        confirmingDelete={sheet?.kind === 'delete'}
        onEdit={() => setSheet({ kind: 'edit' })}
        onAskDelete={() => setSheet({ kind: 'delete' })}
        onClose={close}
      />
      <PatientFormSheet
        key={sheet?.kind === 'edit' ? 'edit' : 'edit-idle'}
        open={sheet?.kind === 'edit'}
        patient={patient}
        onClose={close}
      />
      <TreatmentFormSheet
        key={caseSheet ? `case-${caseSheet.treatment?.id ?? 'new'}` : 'case-idle'}
        open={caseSheet !== null}
        patientId={patient.id}
        treatment={caseSheet?.treatment}
        onClose={close}
        onSaved={(tr) => setFilter(tr.id)}
      />
    </div>
  )
}
