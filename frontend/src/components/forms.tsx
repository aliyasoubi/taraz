import { useState } from 'react'
import { toast } from 'sonner'
import { ApiError } from '@/lib/api'
import { digitsOnly } from '@/lib/format'
import { ACCOUNT_COLORS, ACCOUNT_KIND_LABEL, BANKS, TREATMENT_LABEL } from '@/lib/labels'
import {
  useSaveAccount,
  useSavePatient,
  useSaveTreatment,
  useSuggestions,
  type AccountInput,
} from '@/lib/queries'
import type { Account, AccountKind, Patient, PatientDetail, Treatment, TreatmentKind } from '@/lib/types'
import { AccountCard } from './AccountCard'
import { Sheet } from './Sheet'
import { Button, Chip, cx, Field, Pressable, Segmented, TextArea, TextInput } from './ui'
import { t } from '@/lib/i18n'

export function errorMessage(err: unknown): string {
  return err instanceof ApiError ? err.message : t('errors.network')
}

// ── Patient ───────────────────────────────────────────────────────────────

export function PatientFormSheet({
  open,
  onClose,
  patient,
  initialName = '',
  onSaved,
}: {
  open: boolean
  onClose: () => void
  patient?: Patient
  initialName?: string
  onSaved?: (p: PatientDetail) => void
}) {
  const [name, setName] = useState(patient?.name ?? initialName)
  const [phone, setPhone] = useState(patient?.phone ?? '')
  const [note, setNote] = useState(patient?.note ?? '')
  const save = useSavePatient()

  const submit = () =>
    save.mutate(
      { id: patient?.id, data: { name, phone: phone || null, note: note || null } },
      {
        onSuccess: (p) => {
          toast.success(patient ? t('patientForm.updated') : t('patientForm.added'))
          onSaved?.(p)
          onClose()
        },
        onError: (e) => toast.error(errorMessage(e)),
      },
    )

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={patient ? t('patientForm.editTitle') : t('patientForm.newTitle')}
      footer={
        <Button className="w-full" onClick={submit} loading={save.isPending} disabled={!name.trim()}>
          {patient ? t('common.save') : t('patientForm.add')}
        </Button>
      }
    >
      <div className="space-y-4">
        <Field label={t('patientForm.name')}>
          <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder={t('patientForm.namePlaceholder')} autoFocus />
        </Field>
        <Field label={t('patientForm.phone')} hint={t('common.optional')}>
          <TextInput
            value={phone}
            onChange={(e) => setPhone(digitsOnly(e.target.value))}
            inputMode="tel"
            dir="ltr"
            className="text-end"
            placeholder="09xx xxx xxxx"
          />
        </Field>
        <Field label={t('patientForm.note')} hint={t('common.optional')}>
          <TextArea value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
      </div>
    </Sheet>
  )
}

// ── Treatment case ────────────────────────────────────────────────────────

const KIND_ORDER: TreatmentKind[] = [
  'general',
  'implant',
  'ortho',
  'laminate',
  'composite',
  'endo',
  'surgery',
  'prosthesis',
  'cosmetic',
  'other',
]

export function TreatmentFormSheet({
  open,
  onClose,
  patientId,
  treatment,
  onSaved,
}: {
  open: boolean
  onClose: () => void
  patientId: number
  treatment?: Treatment
  onSaved?: (t: Treatment) => void
}) {
  const [kind, setKind] = useState<TreatmentKind>(treatment?.kind ?? 'implant')
  const [title, setTitle] = useState(treatment?.title ?? '')
  const [doctor, setDoctor] = useState(treatment?.doctor ?? '')
  const [done, setDone] = useState(treatment?.status === 'completed')
  const save = useSaveTreatment(patientId)
  const doctors = useSuggestions().data?.doctors ?? []

  const submit = () =>
    save.mutate(
      {
        id: treatment?.id,
        data: {
          kind,
          title: title.trim() || TREATMENT_LABEL[kind],
          doctor: doctor || null,
          status: done ? 'completed' : 'active',
        },
      },
      {
        onSuccess: (saved) => {
          toast.success(treatment ? t('treatmentForm.updated') : t('treatmentForm.created'))
          onSaved?.(saved)
          onClose()
        },
        onError: (e) => toast.error(errorMessage(e)),
      },
    )

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={treatment ? t('treatmentForm.editTitle') : t('treatmentForm.newTitle')}
      subtitle={t('treatmentForm.subtitle')}
      footer={
        <Button className="w-full" onClick={submit} loading={save.isPending}>
          {treatment ? t('common.save') : t('treatmentForm.create')}
        </Button>
      }
    >
      <div className="space-y-5">
        <div>
          <span className="mb-2 block text-[13px] font-medium text-ink-2">{t('treatmentForm.kind')}</span>
          <div className="flex flex-wrap gap-2">
            {KIND_ORDER.map((k) => (
              <Chip key={k} active={kind === k} onClick={() => setKind(k)}>
                {TREATMENT_LABEL[k]}
              </Chip>
            ))}
          </div>
        </div>
        <Field label={t('treatmentForm.title')} hint={t('treatmentForm.titleHint')}>
          <TextInput value={title} onChange={(e) => setTitle(e.target.value)} placeholder={TREATMENT_LABEL[kind]} />
        </Field>
        <Field label={t('treatmentForm.doctor')} hint={t('common.optional')}>
          <TextInput value={doctor} onChange={(e) => setDoctor(e.target.value)} placeholder={t('treatmentForm.doctorPlaceholder')} />
        </Field>
        {doctors.length > 0 && (
          <div className="-mt-3 flex flex-wrap gap-2">
            {doctors.slice(0, 6).map((d) => (
              <Chip key={d} active={doctor === d} onClick={() => setDoctor(d)}>
                {d}
              </Chip>
            ))}
          </div>
        )}
        {treatment && (
          <Segmented
            value={done ? 'done' : 'active'}
            onChange={(v) => setDone(v === 'done')}
            options={[
              { value: 'active', label: t('treatmentForm.active') },
              { value: 'done', label: t('treatmentForm.completed') },
            ]}
          />
        )}
      </div>
    </Sheet>
  )
}

// ── Destination account ───────────────────────────────────────────────────

const ACCOUNT_KINDS: AccountKind[] = ['own', 'staff', 'third_party', 'pos', 'cash', 'other']

export function AccountFormSheet({
  open,
  onClose,
  account,
  onSaved,
}: {
  open: boolean
  onClose: () => void
  account?: Account
  onSaved?: (a: Account) => void
}) {
  const [form, setForm] = useState<AccountInput>({
    title: account?.title ?? '',
    owner_name: account?.owner_name ?? '',
    bank: account?.bank ?? '',
    kind: account?.kind ?? 'own',
    card_last4: account?.card_last4 ?? '',
    color: account?.color ?? 'violet',
    note: account?.note ?? '',
  })
  const set = <K extends keyof AccountInput>(k: K, v: AccountInput[K]) => setForm((f) => ({ ...f, [k]: v }))
  const save = useSaveAccount()

  const autoTitle = [form.bank, form.owner_name].filter(Boolean).join(' — ')
  const submit = () =>
    save.mutate(
      {
        id: account?.id,
        data: {
          ...form,
          title: form.title?.trim() || autoTitle || ACCOUNT_KIND_LABEL[form.kind],
          owner_name: form.owner_name || null,
          bank: form.bank || null,
          card_last4: form.card_last4 || null,
          note: form.note || null,
        },
      },
      {
        onSuccess: (a) => {
          toast.success(account ? t('accountForm.updated') : t('accountForm.added'))
          onSaved?.(a)
          onClose()
        },
        onError: (e) => toast.error(errorMessage(e)),
      },
    )

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={account ? t('accountForm.editTitle') : t('accountForm.newTitle')}
      subtitle={t('accountForm.subtitle')}
      footer={
        <Button className="w-full" onClick={submit} loading={save.isPending}>
          {account ? t('common.save') : t('accountForm.add')}
        </Button>
      }
    >
      <div className="space-y-5">
        <AccountCard
          account={{
            ...form,
            title: form.title || autoTitle || t('common.newAccount'),
            received_this_month: account?.received_this_month ?? 0,
          }}
          className="mx-auto max-w-sm"
        />
        <div>
          <span className="mb-2 block text-[13px] font-medium text-ink-2">{t('accountForm.kind')}</span>
          <div className="flex flex-wrap gap-2">
            {ACCOUNT_KINDS.map((k) => (
              <Chip key={k} active={form.kind === k} onClick={() => set('kind', k)}>
                {ACCOUNT_KIND_LABEL[k]}
              </Chip>
            ))}
          </div>
        </div>
        <Field label={t('accountForm.owner')} hint={form.kind === 'third_party' ? t('accountForm.ownerThirdPartyHint') : undefined}>
          <TextInput value={form.owner_name ?? ''} onChange={(e) => set('owner_name', e.target.value)} placeholder={t('accountForm.ownerPlaceholder')} />
        </Field>
        <div>
          <span className="mb-2 block text-[13px] font-medium text-ink-2">{t('accountForm.bank')}</span>
          <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
            {BANKS.map((b) => (
              <Chip key={b} active={form.bank === b} onClick={() => set('bank', form.bank === b ? '' : b)}>
                {b}
              </Chip>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('accountForm.cardTitle')}>
            <TextInput value={form.title ?? ''} onChange={(e) => set('title', e.target.value)} placeholder={autoTitle || t('common.optional')} />
          </Field>
          <Field label={t('accountForm.last4')}>
            <TextInput
              value={form.card_last4 ?? ''}
              onChange={(e) => set('card_last4', digitsOnly(e.target.value).slice(0, 4))}
              inputMode="numeric"
              dir="ltr"
              placeholder="1234"
              className="text-center tracking-[0.3em]"
            />
          </Field>
        </div>
        <div>
          <span className="mb-2 block text-[13px] font-medium text-ink-2">{t('accountForm.color')}</span>
          <div className="flex flex-wrap gap-3">
            {Object.entries(ACCOUNT_COLORS).map(([key, [a, b]]) => (
              <Pressable
                key={key}
                onClick={() => set('color', key)}
                aria-label={key}
                className={cx('size-10 rounded-full ring-offset-2 ring-offset-surface', form.color === key && 'ring-2 ring-ink')}
                style={{ background: `linear-gradient(135deg, ${a}, ${b})` }}
              />
            ))}
          </div>
        </div>
      </div>
    </Sheet>
  )
}
