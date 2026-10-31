import { Plus, Settings, Users } from 'lucide-react'
import { useDeferredValue, useState } from 'react'
import { useNavigate } from 'react-router'
import { useDashboard } from '@/features/dashboard/api'
import { PatientFormSheet } from '@/features/patients/components/PatientFormSheet'
import { usePatients } from '@/features/patients/api'
import type { Patient } from '@/shared/api/types'
import { faDigits } from '@/shared/lib/format'
import { t } from '@/shared/lib/i18n'
import { relativeDay } from '@/shared/lib/jalali'
import {
  AnimatedMoney,
  Avatar,
  Empty,
  IconButton,
  ListRow,
  ListSection,
  Money,
  PageHeader,
  SearchField,
  Segmented,
  Skeleton,
} from '@/shared/ui'

type Scope = 'debtor' | 'all'

/** The first tab: how much is owed in total, and by whom, largest debt first. */
export function PatientsPage() {
  const [q, setQ] = useState('')
  const [scope, setScope] = useState<Scope>('debtor')
  const [adding, setAdding] = useState(false)
  const navigate = useNavigate()
  const query = useDeferredValue(q).trim()
  const searching = query !== ''
  const { data, isLoading } = usePatients({ q: query, status: searching ? 'all' : scope, sort: 'balance' })
  const dashboard = useDashboard().data

  return (
    <div>
      <PageHeader
        title={t('patients.title')}
        actions={
          <>
            <IconButton onClick={() => navigate('/settings')} aria-label={t('settings.title')}>
              <Settings className="size-[22px]" />
            </IconButton>
            <IconButton onClick={() => setAdding(true)} aria-label={t('common.newPatient')}>
              <Plus className="size-[26px]" />
            </IconButton>
          </>
        }
      >
        <SearchField value={q} onChange={setQ} placeholder={t('patients.search')} />
      </PageHeader>

      <div className="px-4">
        {!searching && (
          <>
            <div className="mt-2 rounded-[12px] bg-surface px-4 pt-3.5 pb-4">
              <p className="text-[13px] text-ink-2">{t('home.receivable')}</p>
              {dashboard ? (
                <>
                  <AnimatedMoney
                    value={dashboard.receivable}
                    maxSize={34}
                    className="mt-0.5 font-bold tracking-tight"
                  />
                  <p className="mt-0.5 text-[13px] text-ink-2">
                    {t('patients.fromDebtors', { n: faDigits(dashboard.debtors_count) })}
                  </p>
                </>
              ) : (
                <Skeleton className="mt-2 h-14" />
              )}
            </div>

            <Segmented
              className="mt-6"
              value={scope}
              onChange={setScope}
              options={[
                { value: 'debtor', label: t('patients.debtors') },
                { value: 'all', label: t('common.all') },
              ]}
            />
          </>
        )}

        {isLoading ? (
          <div className="mt-4 space-y-px overflow-hidden rounded-[12px]">
            {Array.from({ length: 8 }, (_, i) => (
              <Skeleton key={i} className="h-[62px] rounded-none" />
            ))}
          </div>
        ) : !data?.length ? (
          <Empty
            icon={<Users />}
            title={searching ? t('patients.notFound') : t('patients.empty')}
            hint={searching ? t('patients.notFoundHint') : t('patients.emptyHint')}
          />
        ) : (
          <ListSection className="mt-4" footer={t('common.patientsCount', { n: faDigits(data.length) })}>
            {data.map((p) => (
              <PatientRow key={p.id} patient={p} />
            ))}
          </ListSection>
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

function PatientRow({ patient: p }: { patient: Patient }) {
  return (
    <ListRow
      to={`/patients/${p.id}`}
      icon={<Avatar name={p.name} size={38} />}
      title={p.name}
      subtitle={p.last_activity ? relativeDay(p.last_activity) : t('common.noTransactions')}
      value={
        p.balance === 0 ? (
          <span className="text-[15px]">{t('tone.settled')}</span>
        ) : (
          <Money value={p.balance} tone="auto" unit={false} className="text-[17px]" />
        )
      }
      chevron
    />
  )
}
