import { AnimatePresence, motion } from 'motion/react'
import { Plus, Search, UserPlus, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { formatMoney, UNIT_LABEL } from '@/lib/format'
import { todayIso } from '@/lib/jalali'
import { CHEQUE_LABEL, METHOD_LABEL, QUICK_NOTES, TX_LABEL, TX_SHORT_LABEL } from '@/lib/labels'
import { useAccounts, usePatient, usePatients, useSaveTransaction, useSuggestions } from '@/lib/queries'
import { usePrefs } from '@/lib/settings'
import type { ChequeStatus, PaymentMethod, Transaction, TxType } from '@/lib/types'
import { AccountCard } from './AccountCard'
import { AmountInput } from './AmountInput'
import { Avatar } from './Avatar'
import { DateField } from './DatePicker'
import { AccountFormSheet, errorMessage, PatientFormSheet, TreatmentFormSheet } from './forms'
import { Money } from './Money'
import { Sheet } from './Sheet'
import { Button, Chip, cx, Field, Pressable, Segmented, spring, TextInput } from './ui'
import { t } from '@/lib/i18n'

export interface TxPreset {
  patientId?: number
  type?: TxType
  treatmentId?: number
}

const METHODS: PaymentMethod[] = ['card', 'pos', 'transfer', 'cash', 'cheque', 'currency', 'other']
const LAST_ACCOUNT_KEY = 'taraz.lastAccount'

function rememberedAccount(): number | null {
  try {
    const v = Number(localStorage.getItem(LAST_ACCOUNT_KEY))
    return Number.isFinite(v) && v > 0 ? v : null
  } catch {
    return null
  }
}

function SectionLabel({ children, hint }: { children: React.ReactNode; hint?: React.ReactNode }) {
  return (
    <div className="mb-2 flex items-baseline justify-between">
      <span className="text-[13px] font-semibold text-ink-2">{children}</span>
      {hint && <span className="text-[11px] text-ink-3">{hint}</span>}
    </div>
  )
}

function PatientPicker({ onPick }: { onPick: (id: number) => void }) {
  const [q, setQ] = useState('')
  const [creating, setCreating] = useState(false)
  const { data = [], isFetching } = usePatients({ q, sort: q ? 'balance' : 'recent' })
  return (
    <div>
      <div className="relative">
        <Search className="pointer-events-none absolute start-4 top-1/2 size-5 -translate-y-1/2 text-ink-3" />
        <TextInput value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('txForm.searchPatient')} className="ps-12" autoFocus />
      </div>
      <div className="mt-2 max-h-64 space-y-1 overflow-y-auto">
        {data.slice(0, 30).map((p) => (
          <Pressable
            key={p.id}
            onClick={() => onPick(p.id)}
            className="flex w-full items-center gap-3 rounded-2xl px-2 py-2 text-start active:bg-surface-2"
          >
            <Avatar name={p.name} size={36} />
            <span className="flex-1 truncate font-medium">{p.name}</span>
            {p.balance !== 0 && <Money value={p.balance} tone="auto" compact className="text-xs font-semibold" />}
          </Pressable>
        ))}
        {!isFetching && data.length === 0 && <p className="py-3 text-center text-sm text-ink-3">{t('txForm.noPatientFound')}</p>}
      </div>
      <Pressable
        onClick={() => setCreating(true)}
        className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-line-2 py-3 text-sm font-semibold text-brand"
      >
        <UserPlus className="size-4" />
        {q.trim() ? t('txForm.addNamed', { name: q.trim() }) : t('common.newPatient')}
      </Pressable>
      <PatientFormSheet
        key={creating ? 'new' : 'idle'}
        open={creating}
        initialName={q.trim()}
        onClose={() => setCreating(false)}
        onSaved={(p) => onPick(p.id)}
      />
    </div>
  )
}

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
  const [type, setType] = useState<TxType>(editing?.type ?? preset?.type ?? 'payment')
  const [patientId, setPatientId] = useState<number | null>(editing?.patient_id ?? preset?.patientId ?? null)
  const [treatmentId, setTreatmentId] = useState<number | null>(editing?.treatment_id ?? preset?.treatmentId ?? null)
  const [amount, setAmount] = useState<number | null>(editing?.amount ?? null)
  const [occurredOn, setOccurredOn] = useState(editing?.occurred_on ?? todayIso())
  const [description, setDescription] = useState(editing?.description ?? '')
  const [payerOther, setPayerOther] = useState(Boolean(editing?.payer_name))
  const [payerName, setPayerName] = useState(editing?.payer_name ?? '')
  const [chosenAccountId, setAccountId] = useState<number | null>(editing ? editing.account_id : rememberedAccount())
  const [method, setMethod] = useState<PaymentMethod>(editing?.method ?? 'card')
  const [reference, setReference] = useState(editing?.reference ?? '')
  const [chequeDue, setChequeDue] = useState(editing?.cheque_due_on ?? '')
  const [chequeStatus, setChequeStatus] = useState<ChequeStatus>(editing?.cheque_status ?? 'pending')
  const [sheet, setSheet] = useState<null | 'account' | 'treatment'>(null)

  const patient = usePatient(patientId ?? NaN)
  const accounts = useAccounts()
  const payers = useSuggestions().data?.payers ?? []
  const save = useSaveTransaction()

  // A remembered account that has since been deleted is quietly dropped.
  const accountId =
    accounts.data && chosenAccountId !== null && !accounts.data.some((a) => a.id === chosenAccountId)
      ? null
      : chosenAccountId
  const activeAccounts = useMemo(
    () => (accounts.data ?? []).filter((a) => !a.is_archived || a.id === accountId),
    [accounts.data, accountId],
  )

  const moneyFlow = type === 'payment' || type === 'refund'
  const isCheque = type === 'payment' && method === 'cheque'
  const valid = Boolean(patientId && amount && amount > 0 && occurredOn && (!isCheque || chequeDue))

  const submit = () => {
    if (!valid || !patientId || !amount) return
    save.mutate(
      {
        id: editing?.id,
        data: {
          patient_id: patientId,
          treatment_id: treatmentId,
          type,
          amount,
          occurred_on: occurredOn,
          description: description.trim() || null,
          payer_name: type === 'payment' && payerOther ? payerName.trim() || null : null,
          account_id: moneyFlow ? accountId : null,
          method: moneyFlow ? method : null,
          reference: moneyFlow ? reference.trim() || null : null,
          cheque_due_on: isCheque ? chequeDue : null,
          cheque_status: isCheque ? chequeStatus : null,
        },
      },
      {
        onSuccess: (tx) => {
          if (moneyFlow && accountId) {
            try {
              localStorage.setItem(LAST_ACCOUNT_KEY, String(accountId))
            } catch {
              /* convenience only */
            }
          }
          toast.success(editing ? t('txForm.saved') : t('txForm.created', { type: TX_LABEL[type] }))
          onClose()
          onSaved?.(tx)
        },
        onError: (e) => toast.error(errorMessage(e)),
      },
    )
  }

  const tone = type === 'charge' ? 'debt' : type === 'payment' ? 'credit' : 'brand'
  const p = patient.data

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={editing ? t('txForm.editTitle') : t('txForm.newTitle')}
      footer={
        <Button className="w-full" onClick={submit} loading={save.isPending} disabled={!valid}>
          {editing ? t('txForm.saveChanges') : t('txForm.submit', { type: TX_LABEL[type] })}
          {amount ? (
            <span className="tabular rounded-lg bg-white/20 px-2 py-0.5 text-[13px]">
              {formatMoney(amount, unit)} {UNIT_LABEL[unit]}
            </span>
          ) : null}
        </Button>
      }
    >
      <div className="space-y-6">
        <Segmented
          value={type}
          onChange={setType}
          options={[
            { value: 'payment', label: TX_SHORT_LABEL.payment },
            { value: 'charge', label: TX_SHORT_LABEL.charge },
            { value: 'discount', label: TX_SHORT_LABEL.discount },
            { value: 'refund', label: TX_SHORT_LABEL.refund },
          ]}
        />

        {/* Patient */}
        <div>
          <SectionLabel>{t('common.patient')}</SectionLabel>
          {patientId && p ? (
            <motion.div layout className="flex items-center gap-3 rounded-2xl border border-line bg-surface-2/60 p-3">
              <Avatar name={p.name} size={42} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{p.name}</p>
                <p className="text-xs text-ink-3">
                  {t('txForm.currentBalance')} <Money value={p.balance} tone="auto" className="font-semibold" />
                </p>
              </div>
              {!editing && (
                <button
                  type="button"
                  onClick={() => {
                    setPatientId(null)
                    setTreatmentId(null)
                  }}
                  className="grid size-8 place-items-center rounded-full bg-surface text-ink-3"
                  aria-label={t('txForm.changePatient')}
                >
                  <X className="size-4" />
                </button>
              )}
            </motion.div>
          ) : patientId ? (
            <div className="h-[68px] rounded-2xl shimmer" />
          ) : (
            <PatientPicker onPick={setPatientId} />
          )}
        </div>

        <div>
          <SectionLabel>{t('amount.label')}</SectionLabel>
          <AmountInput value={amount} onChange={setAmount} tone={tone} />
        </div>

        <AnimatePresence initial={false}>
          {moneyFlow && (
            <motion.div
              key="flow"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={spring}
              className="space-y-6 overflow-hidden"
            >
              {type === 'payment' && (
                <div>
                  <SectionLabel hint={t('txForm.payerHint')}>{t('txForm.payerLabel')}</SectionLabel>
                  <Segmented
                    value={payerOther ? 'other' : 'self'}
                    onChange={(v) => setPayerOther(v === 'other')}
                    options={[
                      { value: 'self', label: t('common.self') },
                      { value: 'other', label: t('txForm.someoneElse') },
                    ]}
                  />
                  {payerOther && (
                    <div className="mt-3">
                      <TextInput
                        value={payerName}
                        onChange={(e) => setPayerName(e.target.value)}
                        placeholder={t('txForm.payerPlaceholder')}
                      />
                      {payers.length > 0 && (
                        <div className="no-scrollbar -mx-5 mt-2 flex gap-2 overflow-x-auto px-5">
                          {payers.slice(0, 12).map((n) => (
                            <Chip key={n} active={payerName === n} onClick={() => setPayerName(n)}>
                              {n}
                            </Chip>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div>
                <SectionLabel hint={type === 'refund' ? t('txForm.refundFromHint') : t('txForm.destinationHint')}>
                  {type === 'refund' ? t('txForm.refundFromLabel') : t('txForm.destinationLabel')}
                </SectionLabel>
                <div className="no-scrollbar -mx-5 flex gap-3 overflow-x-auto px-5 py-1">
                  {activeAccounts.map((a) => (
                    <Pressable
                      key={a.id}
                      onClick={() => setAccountId(a.id === accountId ? null : a.id)}
                      className={cx('shrink-0 rounded-2xl transition-opacity', accountId !== null && a.id !== accountId && 'opacity-45')}
                    >
                      <AccountCard account={a} size="sm" selected={a.id === accountId} />
                    </Pressable>
                  ))}
                  <Pressable
                    onClick={() => setSheet('account')}
                    className="grid h-[92px] w-[110px] shrink-0 place-items-center rounded-2xl border border-dashed border-line-2 text-ink-3"
                  >
                    <span className="flex flex-col items-center gap-1 text-xs font-semibold">
                      <Plus className="size-5" />
                      {t('common.newAccount')}
                    </span>
                  </Pressable>
                </div>
              </div>

              <div>
                <SectionLabel>{t('txForm.methodLabel')}</SectionLabel>
                <div className="flex flex-wrap gap-2">
                  {METHODS.filter((m) => type === 'payment' || m !== 'cheque').map((m) => (
                    <Chip key={m} active={method === m} onClick={() => setMethod(m)}>
                      {METHOD_LABEL[m]}
                    </Chip>
                  ))}
                </div>
              </div>

              {isCheque ? (
                <div className="space-y-4 rounded-3xl border border-warn/25 bg-warn/5 p-4">
                  <DateField label={t('txForm.chequeDueLabel')} value={chequeDue} onChange={setChequeDue} quick={false} />
                  <Field label={t('common.chequeNumber')} hint={t('common.optional')}>
                    <TextInput value={reference} onChange={(e) => setReference(e.target.value)} inputMode="numeric" dir="ltr" />
                  </Field>
                  <Segmented
                    value={chequeStatus}
                    onChange={setChequeStatus}
                    options={(['pending', 'cleared', 'bounced'] as const).map((s) => ({ value: s, label: CHEQUE_LABEL[s] }))}
                  />
                  <p className="text-xs leading-6 text-ink-3">
                    {t('txForm.chequeNote')}
                  </p>
                </div>
              ) : (
                <Field label={t('common.reference')} hint={t('common.optional')}>
                  <TextInput value={reference} onChange={(e) => setReference(e.target.value)} dir="ltr" inputMode="numeric" />
                </Field>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Treatment case */}
        {p && (
          <div>
            <SectionLabel hint={t('common.optional')}>{t('txForm.caseLabel')}</SectionLabel>
            <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5">
              <Chip active={treatmentId === null} onClick={() => setTreatmentId(null)}>
                {t('common.noCase')}
              </Chip>
              {p.treatments.map((tr) => (
                <Chip key={tr.id} active={treatmentId === tr.id} onClick={() => setTreatmentId(tr.id)}>
                  {tr.title}
                </Chip>
              ))}
              <Chip onClick={() => setSheet('treatment')} className="border-dashed text-brand">
                <Plus className="size-3.5" /> {t('common.newCase')}
              </Chip>
            </div>
          </div>
        )}

        <DateField label={type === 'payment' ? t('txForm.paymentDate') : t('txForm.date')} value={occurredOn} onChange={setOccurredOn} />

        <div>
          <Field label={t('common.description')}>
            <TextInput value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t('common.optional')} />
          </Field>
          <div className="no-scrollbar -mx-5 mt-2 flex gap-2 overflow-x-auto px-5">
            {QUICK_NOTES[type].map((n) => (
              <Chip key={n} active={description === n} onClick={() => setDescription(description === n ? '' : n)}>
                {n}
              </Chip>
            ))}
          </div>
        </div>
      </div>

      <AccountFormSheet
        key={sheet === 'account' ? 'acc-open' : 'acc'}
        open={sheet === 'account'}
        onClose={() => setSheet(null)}
        onSaved={(a) => setAccountId(a.id)}
      />
      {patientId && (
        <TreatmentFormSheet
          key={sheet === 'treatment' ? 'tr-open' : 'tr'}
          open={sheet === 'treatment'}
          onClose={() => setSheet(null)}
          patientId={patientId}
          onSaved={(tr) => setTreatmentId(tr.id)}
        />
      )}
    </Sheet>
  )
}
