// The pages a transaction form pushes inside its sheet, one per choice, as iOS forms do.
import { CreditCard, Plus, UserPlus } from 'lucide-react'
import { useDeferredValue, useState, type ReactNode } from 'react'
import { AccountFormSheet } from '@/features/accounts/components/AccountFormSheet'
import { usePatients } from '@/features/patients/api'
import { PatientFormSheet } from '@/features/patients/components/PatientFormSheet'
import { useSuggestions } from '@/features/transactions/api'
import type { Account } from '@/shared/api/types'
import { fold } from '@/shared/lib/text'
import { t } from '@/shared/lib/i18n'
import { Avatar, ListIcon, ListRow, ListSection, Money, SearchField } from '@/shared/ui'

/** A page's scroll area inside the sheet. */
export function FormPage({ children }: { children: ReactNode }) {
  return <div className="absolute inset-0 overflow-y-auto overscroll-contain px-4 pt-1 pb-10">{children}</div>
}

/** A row that starts something new, in the tint colour. */
function AddRow({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <ListRow
      icon={
        <ListIcon>
          <Plus />
        </ListIcon>
      }
      title={<span className="text-brand">{label}</span>}
      onClick={onClick}
    />
  )
}

export function PatientPicker({ onPick }: { onPick: (id: number) => void }) {
  const [q, setQ] = useState('')
  const [creating, setCreating] = useState(false)
  const query = useDeferredValue(q).trim()
  const { data = [] } = usePatients({ q: query, sort: query ? 'balance' : 'recent' })

  return (
    <FormPage>
      <SearchField value={q} onChange={setQ} placeholder={t('txForm.searchPatient')} className="mt-1" />
      {data.length > 0 ? (
        <ListSection className="mt-4">
          {data.slice(0, 40).map((p) => (
            <ListRow
              key={p.id}
              icon={<Avatar name={p.name} size={32} />}
              title={p.name}
              value={p.balance !== 0 ? <Money value={p.balance} tone="auto" compact unit={false} /> : undefined}
              onClick={() => onPick(p.id)}
            />
          ))}
        </ListSection>
      ) : (
        query && <p className="mt-8 text-center text-[15px] text-ink-2">{t('txForm.noPatientFound')}</p>
      )}
      <ListSection className="mt-6">
        <ListRow
          icon={
            <ListIcon>
              <UserPlus />
            </ListIcon>
          }
          title={
            <span className="text-brand">{query ? t('txForm.addNamed', { name: query }) : t('common.newPatient')}</span>
          }
          onClick={() => setCreating(true)}
        />
      </ListSection>
      <PatientFormSheet
        key={creating ? 'new' : 'idle'}
        open={creating}
        initialName={query}
        onClose={() => setCreating(false)}
        onSaved={(p) => onPick(p.id)}
      />
    </FormPage>
  )
}

/** Who paid: the patient, or someone paying for them (typed, or one used before). */
export function PayerPicker({
  someoneElse,
  name,
  onChange,
  onDone,
}: {
  someoneElse: boolean
  name: string
  onChange: (patch: { payerIsSomeoneElse: boolean; payerName?: string }) => void
  onDone: () => void
}) {
  const previous = useSuggestions().data?.payers ?? []
  const typed = someoneElse ? name : ''
  const matches = typed.trim() ? previous.filter((n) => fold(n).includes(fold(typed.trim()))) : previous

  return (
    <FormPage>
      <ListSection className="mt-2">
        <ListRow
          title={t('common.self')}
          checked={!someoneElse}
          onClick={() => {
            onChange({ payerIsSomeoneElse: false })
            onDone()
          }}
        />
      </ListSection>
      <ListSection header={t('txForm.someoneElse')} footer={t('txForm.payerHint')}>
        <ListRow>
          <input
            value={typed}
            onChange={(e) => onChange({ payerIsSomeoneElse: true, payerName: e.target.value })}
            placeholder={t('txForm.payerPlaceholder')}
            className="min-w-0 flex-1 bg-transparent text-[17px] caret-brand outline-none placeholder:text-ink-3"
          />
        </ListRow>
      </ListSection>
      {matches.length > 0 && (
        <ListSection header={t('txForm.previousPayers')}>
          {matches.slice(0, 15).map((n) => (
            <ListRow
              key={n}
              title={n}
              checked={someoneElse && name === n}
              onClick={() => {
                onChange({ payerIsSomeoneElse: true, payerName: n })
                onDone()
              }}
            />
          ))}
        </ListSection>
      )}
    </FormPage>
  )
}

/** Where the money went (or, for a refund, came from). */
export function AccountPicker({
  accounts,
  selectedId,
  onPick,
}: {
  accounts: Account[]
  selectedId: number | null
  onPick: (id: number) => void
}) {
  const [creating, setCreating] = useState(false)
  return (
    <FormPage>
      {accounts.length > 0 && (
        <ListSection className="mt-2">
          {accounts.map((a) => (
            <ListRow
              key={a.id}
              icon={
                <span
                  className="grid size-[29px] place-items-center rounded-[7px] text-white"
                  style={{ background: a.color }}
                >
                  <CreditCard className="size-[17px]" />
                </span>
              }
              title={a.title}
              subtitle={[a.owner_name, a.bank].filter(Boolean).join(' · ') || undefined}
              checked={a.id === selectedId}
              onClick={() => onPick(a.id)}
            />
          ))}
        </ListSection>
      )}
      <ListSection className="mt-6">
        <AddRow label={t('common.newAccount')} onClick={() => setCreating(true)} />
      </ListSection>
      <AccountFormSheet
        key={creating ? 'open' : 'idle'}
        open={creating}
        onClose={() => setCreating(false)}
        onSaved={(a) => onPick(a.id)}
      />
    </FormPage>
  )
}

/** A plain list of options with a checkmark on the current one. */
export function ChoicePicker<T extends string | number | null>({
  options,
  value,
  onPick,
  addLabel,
  onAdd,
}: {
  options: { value: T; label: string }[]
  value: T
  onPick: (value: T) => void
  addLabel?: string
  onAdd?: () => void
}) {
  return (
    <FormPage>
      <ListSection className="mt-2">
        {options.map((o) => (
          <ListRow key={String(o.value)} title={o.label} checked={o.value === value} onClick={() => onPick(o.value)} />
        ))}
      </ListSection>
      {addLabel && onAdd && (
        <ListSection className="mt-6">
          <AddRow label={addLabel} onClick={onAdd} />
        </ListSection>
      )}
    </FormPage>
  )
}
