import { useState } from 'react'
import { toast } from 'sonner'
import { useSavePatient } from '@/features/patients/api'
import type { Patient, PatientDetail } from '@/shared/api/types'
import { errorMessage } from '@/shared/lib/errors'
import { digitsOnly } from '@/shared/lib/format'
import { t } from '@/shared/lib/i18n'
import { BarButton, Field, Sheet, TextArea, TextInput } from '@/shared/ui'

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
      leading={<BarButton onClick={onClose}>{t('common.cancel')}</BarButton>}
      trailing={
        <BarButton strong onClick={submit} disabled={!name.trim() || save.isPending}>
          {patient ? t('common.save') : t('common.add')}
        </BarButton>
      }
    >
      <div className="space-y-4">
        <Field label={t('patientForm.name')}>
          <TextInput
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('patientForm.namePlaceholder')}
            autoFocus
          />
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
