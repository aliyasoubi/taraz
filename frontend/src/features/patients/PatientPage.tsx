import { Ellipsis } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useParams } from 'react-router'
import { useTransactionSheets } from '@/features/transactions/TransactionSheets'
import type { TxType } from '@/shared/api/types'
import { t } from '@/shared/lib/i18n'
import { IconButton, PageHeader, Skeleton } from '@/shared/ui'
import { usePatient, usePatientTransactions } from './api'
import { LedgerTimeline } from './components/LedgerTimeline'
import { PatientFormSheet } from './components/PatientFormSheet'
import { PatientHero } from './components/PatientHero'
import { PatientMenuSheet } from './components/PatientMenuSheet'
import { QuickActions } from './components/QuickActions'
import { buildLedger } from './ledger'

type OpenSheet = { kind: 'menu' } | { kind: 'edit' } | { kind: 'delete' } | null

export function PatientPage() {
  const id = Number(useParams().id)
  const { data: patient, isLoading } = usePatient(id)
  const { data: transactions } = usePatientTransactions(id)
  const { newTransaction } = useTransactionSheets()
  const [sheet, setSheet] = useState<OpenSheet>(null)
  const ledger = useMemo(() => buildLedger(transactions ?? []), [transactions])

  if (isLoading || !patient) {
    return (
      <div>
        <PageHeader large={false} title="" back={t('patients.title')} />
        <div className="flex flex-col items-center px-4">
          <Skeleton className="size-[84px] rounded-full" />
          <Skeleton className="mt-4 h-7 w-40" />
          <Skeleton className="mt-6 h-36 w-full" />
        </div>
      </div>
    )
  }

  const close = () => setSheet(null)
  const add = (type: TxType) => {
    close()
    newTransaction({ patientId: patient.id, type })
  }

  return (
    <div>
      <PageHeader
        large={false}
        titleAfter={120}
        title={patient.name}
        back={t('patients.title')}
        actions={
          <IconButton onClick={() => setSheet({ kind: 'menu' })} aria-label={t('common.options')}>
            <span className="grid size-[26px] place-items-center rounded-full border-[1.8px] border-current">
              <Ellipsis className="size-4" strokeWidth={3} />
            </span>
          </IconButton>
        }
      />

      <div className="px-4">
        <PatientHero patient={patient} />
        <QuickActions onAdd={add} />
        {transactions ? <LedgerTimeline ledger={ledger} /> : <Skeleton className="mt-8 h-48" />}
      </div>

      <PatientMenuSheet
        patient={patient}
        open={sheet?.kind === 'menu'}
        confirmingDelete={sheet?.kind === 'delete'}
        onAdd={add}
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
    </div>
  )
}
