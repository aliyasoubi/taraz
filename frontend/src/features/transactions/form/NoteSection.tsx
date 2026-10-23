import type { TxType } from '@/shared/api/types'
import { t } from '@/shared/lib/i18n'
import { QUICK_NOTES } from '@/shared/lib/labels'
import { Chip, Field, TextInput } from '@/shared/ui'

/** Free-text description with one-tap common notes for the type. */
export function NoteSection({ type, value, onChange }: { type: TxType; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <Field label={t('common.description')}>
        <TextInput value={value} onChange={(e) => onChange(e.target.value)} placeholder={t('common.optional')} />
      </Field>
      <div className="-mx-5 mt-2 no-scrollbar flex gap-2 overflow-x-auto px-5">
        {QUICK_NOTES[type].map((note) => (
          <Chip key={note} active={value === note} onClick={() => onChange(value === note ? '' : note)}>
            {note}
          </Chip>
        ))}
      </div>
    </div>
  )
}
