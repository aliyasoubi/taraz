import { AnimatePresence, motion } from 'motion/react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useAccounts } from '@/features/accounts/api'
import { usePatient } from '@/features/patients/api'
import { useSaveTransaction } from '@/features/transactions/api'
import type { Transaction } from '@/shared/api/types'
import { errorMessage } from '@/shared/lib/errors'
import { formatMoney, UNIT_LABEL } from '@/shared/lib/format'
import { t } from '@/shared/lib/i18n'
import { todayIso } from '@/shared/lib/jalali'
import { TX_LABEL, TX_SHORT_LABEL } from '@/shared/lib/labels'
import { usePrefs } from '@/shared/lib/settings'
import { AmountInput, Button, DateField, Segmented, Sheet, spring } from '@/shared/ui'
import { CaseSection } from '../form/CaseSection'
import { DestinationSection } from '../form/DestinationSection'
import { readLastAccount, rememberLastAccount } from '../form/lastAccount'
import { canSubmit, initialFormState, movesMoney, toPayload, type TxFormState, type TxPreset } from '../form/model'
import { NoteSection } from '../form/NoteSection'
import { PatientSection } from '../form/PatientSection'
import { PayerSection } from '../form/PayerSection'
import { PaymentDetailsSection } from '../form/PaymentDetailsSection'
import { SectionLabel } from '../form/SectionLabel'

const AMOUNT_TONE = { charge: 'debt', payment: 'credit', discount: 'brand', refund: 'brand' } as const

/** Create or edit any ledger line. For a payment it captures the full transfer: who paid → which account. */
export function TxFormSheet({
  open,
  onClose,
  preset,
  editing,
  onSaved,
}: {
  open: boolean
  onClose: () => void
  preset?: TxPreset
  editing?: Transaction
  onSaved?: (tx: Transaction) => void
}) {
  const { unit } = usePrefs()
  const [form, setForm] = useState<TxFormState>(() =>
    initialFormState({ preset, editing, lastAccountId: readLastAccount(), today: todayIso() }),
  )
  const update = (patch: Partial<TxFormState>) => setForm((f) => ({ ...f, ...patch }))

  const patient = usePatient(form.patientId ?? NaN).data
  const accounts = useAccounts().data
  const save = useSaveTransaction()

  // A remembered account that has since been deleted is quietly dropped; archived ones stay hidden
  // unless this row already uses one.
  const accountId =
    accounts && form.accountId !== null && !accounts.some((a) => a.id === form.accountId) ? null : form.accountId
  const selectableAccounts = useMemo(
    () => (accounts ?? []).filter((a) => !a.is_archived || a.id === accountId),
    [accounts, accountId],
  )
  const current = { ...form, accountId }
  const valid = canSubmit(current)

  const submit = () => {
    if (!valid) return
    save.mutate(
      { id: editing?.id, data: toPayload(current) },
      {
        onSuccess: (tx) => {
          if (movesMoney(current.type) && accountId) rememberLastAccount(accountId)
          toast.success(editing ? t('txForm.saved') : t('txForm.created', { type: TX_LABEL[current.type] }))
          onClose()
          onSaved?.(tx)
        },
        onError: (e) => toast.error(errorMessage(e)),
      },
    )
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={editing ? t('txForm.editTitle') : t('txForm.newTitle')}
      footer={
        <Button className="w-full" onClick={submit} loading={save.isPending} disabled={!valid}>
          {editing ? t('txForm.saveChanges') : t('txForm.submit', { type: TX_LABEL[form.type] })}
          {form.amount ? (
            <span className="rounded-lg bg-white/20 px-2 py-0.5 text-[13px] tabular">
              {formatMoney(form.amount, unit)} {UNIT_LABEL[unit]}
            </span>
          ) : null}
        </Button>
      }
    >
      <div className="space-y-6">
        <Segmented
          value={form.type}
          onChange={(type) => update({ type })}
          options={(['payment', 'charge', 'discount', 'refund'] as const).map((v) => ({
            value: v,
            label: TX_SHORT_LABEL[v],
          }))}
        />

        <PatientSection
          patientId={form.patientId}
          patient={patient}
          locked={Boolean(editing)}
          onPick={(patientId) => update({ patientId })}
          onClear={() => update({ patientId: null, treatmentId: null })}
        />

        <div>
          <SectionLabel>{t('amount.label')}</SectionLabel>
          <AmountInput value={form.amount} onChange={(amount) => update({ amount })} tone={AMOUNT_TONE[form.type]} />
        </div>

        <AnimatePresence initial={false}>
          {movesMoney(form.type) && (
            <motion.div
              key="transfer"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={spring}
              className="space-y-6 overflow-hidden"
            >
              {form.type === 'payment' && (
                <PayerSection
                  someoneElse={form.payerIsSomeoneElse}
                  name={form.payerName}
                  onSomeoneElse={(payerIsSomeoneElse) => update({ payerIsSomeoneElse })}
                  onName={(payerName) => update({ payerName })}
                />
              )}
              <DestinationSection
                accounts={selectableAccounts}
                selectedId={accountId}
                refund={form.type === 'refund'}
                onSelect={(id) => update({ accountId: id })}
              />
              <PaymentDetailsSection value={form} type={form.type} onChange={update} />
            </motion.div>
          )}
        </AnimatePresence>

        {patient && (
          <CaseSection
            patient={patient}
            selectedId={form.treatmentId}
            onSelect={(treatmentId) => update({ treatmentId })}
          />
        )}

        <DateField
          label={form.type === 'payment' ? t('txForm.paymentDate') : t('txForm.date')}
          value={form.occurredOn}
          onChange={(occurredOn) => update({ occurredOn })}
        />

        <NoteSection type={form.type} value={form.description} onChange={(description) => update({ description })} />
      </div>
    </Sheet>
  )
}
