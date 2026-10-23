import { useState } from 'react'
import { toast } from 'sonner'
import { useSaveTreatment } from '@/features/patients/api'
import { useSuggestions } from '@/features/transactions/api'
import type { Treatment, TreatmentKind } from '@/shared/api/types'
import { errorMessage } from '@/shared/lib/errors'
import { t } from '@/shared/lib/i18n'
import { TREATMENT_LABEL } from '@/shared/lib/labels'
import { Button, Chip, Field, Segmented, Sheet, TextInput } from '@/shared/ui'

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
          <TextInput
            value={doctor}
            onChange={(e) => setDoctor(e.target.value)}
            placeholder={t('treatmentForm.doctorPlaceholder')}
          />
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
