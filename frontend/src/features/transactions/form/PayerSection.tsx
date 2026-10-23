import { useSuggestions } from '@/features/transactions/api'
import { t } from '@/shared/lib/i18n'
import { Chip, Segmented, TextInput } from '@/shared/ui'
import { SectionLabel } from './SectionLabel'

/** The transfer's source: the patient, or someone paying for them. */
export function PayerSection({
  someoneElse,
  name,
  onSomeoneElse,
  onName,
}: {
  someoneElse: boolean
  name: string
  onSomeoneElse: (value: boolean) => void
  onName: (value: string) => void
}) {
  const previous = useSuggestions().data?.payers ?? []
  return (
    <div>
      <SectionLabel hint={t('txForm.payerHint')}>{t('txForm.payerLabel')}</SectionLabel>
      <Segmented
        value={someoneElse ? 'other' : 'self'}
        onChange={(v) => onSomeoneElse(v === 'other')}
        options={[
          { value: 'self', label: t('common.self') },
          { value: 'other', label: t('txForm.someoneElse') },
        ]}
      />
      {someoneElse && (
        <div className="mt-3">
          <TextInput value={name} onChange={(e) => onName(e.target.value)} placeholder={t('txForm.payerPlaceholder')} />
          {previous.length > 0 && (
            <div className="-mx-5 mt-2 no-scrollbar flex gap-2 overflow-x-auto px-5">
              {previous.slice(0, 12).map((n) => (
                <Chip key={n} active={name === n} onClick={() => onName(n)}>
                  {n}
                </Chip>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
