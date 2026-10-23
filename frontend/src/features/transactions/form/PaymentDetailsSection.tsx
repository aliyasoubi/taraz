import type { TxType } from '@/shared/api/types'
import { t } from '@/shared/lib/i18n'
import { CHEQUE_LABEL, METHOD_LABEL } from '@/shared/lib/labels'
import { Chip, DateField, Field, Segmented, TextInput } from '@/shared/ui'
import { isCheque, methodsFor, type TxFormState } from './model'
import { SectionLabel } from './SectionLabel'

type Details = Pick<TxFormState, 'type' | 'method' | 'reference' | 'chequeDueOn' | 'chequeStatus'>

/** Payment method, plus the cheque's due date and status, or a tracking number. */
export function PaymentDetailsSection({
  value,
  type,
  onChange,
}: {
  value: Details
  type: TxType
  onChange: (patch: Partial<Details>) => void
}) {
  return (
    <>
      <div>
        <SectionLabel>{t('txForm.methodLabel')}</SectionLabel>
        <div className="flex flex-wrap gap-2">
          {methodsFor(type).map((m) => (
            <Chip key={m} active={value.method === m} onClick={() => onChange({ method: m })}>
              {METHOD_LABEL[m]}
            </Chip>
          ))}
        </div>
      </div>

      {isCheque(value) ? (
        <div className="space-y-4 rounded-3xl border border-warn/25 bg-warn/5 p-4">
          <DateField
            label={t('txForm.chequeDueLabel')}
            value={value.chequeDueOn}
            onChange={(chequeDueOn) => onChange({ chequeDueOn })}
            quick={false}
          />
          <Field label={t('common.chequeNumber')} hint={t('common.optional')}>
            <TextInput
              value={value.reference}
              onChange={(e) => onChange({ reference: e.target.value })}
              inputMode="numeric"
              dir="ltr"
            />
          </Field>
          <Segmented
            value={value.chequeStatus}
            onChange={(chequeStatus) => onChange({ chequeStatus })}
            options={(['pending', 'cleared', 'bounced'] as const).map((s) => ({ value: s, label: CHEQUE_LABEL[s] }))}
          />
          <p className="text-xs leading-6 text-ink-3">{t('txForm.chequeNote')}</p>
        </div>
      ) : (
        <Field label={t('common.reference')} hint={t('common.optional')}>
          <TextInput
            value={value.reference}
            onChange={(e) => onChange({ reference: e.target.value })}
            dir="ltr"
            inputMode="numeric"
          />
        </Field>
      )}
    </>
  )
}
