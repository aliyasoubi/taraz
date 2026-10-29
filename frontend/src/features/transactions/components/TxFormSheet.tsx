import { AnimatePresence, motion } from 'motion/react'
import { ChevronRight } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import { useAccounts } from '@/features/accounts/api'
import { usePatient } from '@/features/patients/api'
import { TreatmentFormSheet } from '@/features/patients/components/TreatmentFormSheet'
import { useSaveTransaction } from '@/features/transactions/api'
import {
  canSubmit,
  initialFormState,
  isCheque,
  methodsFor,
  movesMoney,
  toPayload,
  type TxFormState,
  type TxPreset,
} from '@/features/transactions/form/model'
import { readLastAccount, rememberLastAccount } from '@/features/transactions/form/lastAccount'
import { AccountPicker, ChoicePicker, FormPage, PatientPicker, PayerPicker } from '@/features/transactions/form/Pickers'
import type { Transaction } from '@/shared/api/types'
import { errorMessage } from '@/shared/lib/errors'
import { messages, t } from '@/shared/lib/i18n'
import { formatJ, relativeDay, todayIso } from '@/shared/lib/jalali'
import { CHEQUE_LABEL, METHOD_LABEL, QUICK_NOTES, TX_LABEL } from '@/shared/lib/labels'
import {
  AmountInput,
  Avatar,
  BarButton,
  Chip,
  DatePickerSheet,
  ListRow,
  ListSection,
  Money,
  Segmented,
  Sheet,
  stackVariants,
  type StackDirection,
} from '@/shared/ui'

type Page = 'main' | 'patient' | 'payer' | 'account' | 'method' | 'case'

const AMOUNT_TONE = { charge: 'debt', payment: 'credit', discount: 'brand', refund: 'brand' } as const

const inputClass = 'min-w-0 flex-1 bg-transparent text-[17px] caret-brand outline-none placeholder:text-ink-3'

/**
 * Create or edit any ledger line. The common case needs only the amount: the
 * payer defaults to the patient, the account to the one used last, the method
 * to card and the date to today. Each of those is one row; tapping it pushes a
 * page with the choices, inside the sheet, as an iOS form does.
 */
export function TxFormSheet({
  open,
  onClose,
  preset,
  editing,
}: {
  open: boolean
  onClose: () => void
  preset?: TxPreset
  editing?: Transaction
}) {
  const [form, setForm] = useState<TxFormState>(() =>
    initialFormState({ preset, editing, lastAccountId: readLastAccount(), today: todayIso() }),
  )
  const update = (patch: Partial<TxFormState>) => setForm((f) => ({ ...f, ...patch }))
  const [page, setPage] = useState<Page>(form.patientId ? 'main' : 'patient')
  const [direction, setDirection] = useState<StackDirection>('none')
  const [dateFor, setDateFor] = useState<'occurred' | 'cheque' | null>(null)
  const [creatingCase, setCreatingCase] = useState(false)

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
  const account = selectableAccounts.find((a) => a.id === accountId)
  const current = { ...form, accountId }
  const valid = canSubmit(current)
  const money = movesMoney(form.type)
  const cheque = isCheque(form)
  const title = editing ? t('txForm.editTitle') : messages.txForm.titles[form.type]

  const push = (next: Page) => {
    setDirection('push')
    setPage(next)
  }
  const pop = () => {
    setDirection('pop')
    setPage('main')
    // An empty "someone else" means the patient paid.
    if (form.payerIsSomeoneElse && !form.payerName.trim()) update({ payerIsSomeoneElse: false })
  }

  const submit = () => {
    if (!valid) return
    save.mutate(
      { id: editing?.id, data: toPayload(current) },
      {
        onSuccess: () => {
          if (money && accountId) rememberLastAccount(accountId)
          toast.success(editing ? t('txForm.saved') : t('txForm.created', { type: TX_LABEL[current.type] }))
          onClose()
        },
        onError: (e) => toast.error(errorMessage(e)),
      },
    )
  }

  const pages: Record<Exclude<Page, 'main'>, { title: string; body: ReactNode }> = {
    patient: {
      title: t('common.patient'),
      body: (
        <PatientPicker
          onPick={(patientId) => {
            update({ patientId, treatmentId: null })
            pop()
          }}
        />
      ),
    },
    payer: {
      title: t('txForm.payer'),
      body: <PayerPicker someoneElse={form.payerIsSomeoneElse} name={form.payerName} onChange={update} onDone={pop} />,
    },
    account: {
      title: form.type === 'refund' ? t('txForm.refundFromLabel') : t('txForm.to'),
      body: (
        <AccountPicker
          accounts={selectableAccounts}
          selectedId={accountId}
          onPick={(id) => {
            update({ accountId: id })
            pop()
          }}
        />
      ),
    },
    method: {
      title: t('txForm.methodLabel'),
      body: (
        <ChoicePicker
          options={methodsFor(form.type).map((m) => ({ value: m, label: METHOD_LABEL[m] }))}
          value={form.method}
          onPick={(method) => {
            update({ method })
            pop()
          }}
        />
      ),
    },
    case: {
      title: t('txForm.caseLabel'),
      body: (
        <ChoicePicker<number | null>
          options={[
            { value: null, label: t('common.noCase') },
            ...(patient?.treatments ?? []).map((tr) => ({ value: tr.id, label: tr.title })),
          ]}
          value={form.treatmentId}
          onPick={(treatmentId) => {
            update({ treatmentId })
            pop()
          }}
          addLabel={t('common.newCase')}
          onAdd={() => setCreatingCase(true)}
        />
      ),
    },
  }

  const main = (
    <FormPage>
      <ListSection className="mt-1">
        {patient ? (
          <ListRow
            icon={<Avatar name={patient.name} size={36} />}
            title={patient.name}
            subtitle={
              <>
                {t('txForm.currentBalance')} <Money value={patient.balance} tone="auto" />
              </>
            }
            chevron={!editing}
            onClick={editing ? undefined : () => push('patient')}
          />
        ) : (
          <ListRow title={t('txForm.choosePatient')} chevron onClick={() => push('patient')} />
        )}
      </ListSection>

      <AmountInput
        value={form.amount}
        onChange={(amount) => update({ amount })}
        tone={AMOUNT_TONE[form.type]}
        autoFocus={!editing && Boolean(form.patientId) && direction === 'none'}
      />

      <ListSection className="mt-4">
        {form.type === 'payment' && (
          <ListRow
            title={t('txForm.payer')}
            value={form.payerIsSomeoneElse && form.payerName.trim() ? form.payerName : t('common.self')}
            chevron
            onClick={() => push('payer')}
          />
        )}
        {money && (
          <>
            <ListRow
              title={form.type === 'refund' ? t('txForm.refundFromLabel') : t('txForm.to')}
              value={account ? account.title : <span className="text-ink-3">{t('txForm.notChosen')}</span>}
              chevron
              onClick={() => push('account')}
            />
            <ListRow
              title={t('txForm.methodLabel')}
              value={METHOD_LABEL[form.method]}
              chevron
              onClick={() => push('method')}
            />
          </>
        )}
        {patient && patient.treatments.length > 0 && (
          <ListRow
            title={t('txForm.caseLabel')}
            value={patient.treatments.find((tr) => tr.id === form.treatmentId)?.title ?? t('common.noCase')}
            chevron
            onClick={() => push('case')}
          />
        )}
        <ListRow
          title={form.type === 'payment' ? t('txForm.paymentDate') : t('txForm.date')}
          value={relativeDay(form.occurredOn)}
          chevron
          onClick={() => setDateFor('occurred')}
        />
      </ListSection>

      {cheque && (
        <ListSection header={METHOD_LABEL.cheque} footer={t('txForm.chequeNote')}>
          <ListRow
            title={t('txForm.chequeDueLabel')}
            value={
              form.chequeDueOn ? formatJ(form.chequeDueOn) : <span className="text-debt">{t('calendar.choose')}</span>
            }
            chevron
            onClick={() => setDateFor('cheque')}
          />
          <ListRow>
            <input
              value={form.reference}
              onChange={(e) => update({ reference: e.target.value })}
              placeholder={t('common.chequeNumber')}
              inputMode="numeric"
              className={inputClass}
            />
          </ListRow>
          <ListRow>
            <Segmented
              className="flex-1"
              value={form.chequeStatus}
              onChange={(chequeStatus) => update({ chequeStatus })}
              options={(['pending', 'cleared', 'bounced'] as const).map((s) => ({ value: s, label: CHEQUE_LABEL[s] }))}
            />
          </ListRow>
        </ListSection>
      )}

      <ListSection
        footer={
          <div className="-mx-4 mt-1 no-scrollbar flex gap-2 overflow-x-auto px-4">
            {QUICK_NOTES[form.type].map((note) => (
              <Chip
                key={note}
                active={form.description === note}
                onClick={() => update({ description: form.description === note ? '' : note })}
              >
                {note}
              </Chip>
            ))}
          </div>
        }
      >
        <ListRow>
          <input
            value={form.description}
            onChange={(e) => update({ description: e.target.value })}
            placeholder={form.type === 'charge' ? t('txForm.chargePlaceholder') : t('txForm.notePlaceholder')}
            className={inputClass}
          />
        </ListRow>
        {money && !cheque && (
          <ListRow>
            <input
              value={form.reference}
              onChange={(e) => update({ reference: e.target.value })}
              placeholder={t('txForm.referencePlaceholder')}
              inputMode="numeric"
              className={inputClass}
            />
          </ListRow>
        )}
      </ListSection>
    </FormPage>
  )

  const sub = page === 'main' ? null : pages[page]
  const backToMain = !sub ? null : form.patientId ? (
    <button
      type="button"
      onClick={pop}
      className="-ms-2 flex h-11 items-center text-[17px] text-brand active:opacity-40"
    >
      <ChevronRight className="size-7" strokeWidth={2.4} />
      {t('common.back')}
    </button>
  ) : (
    <BarButton onClick={onClose}>{t('common.cancel')}</BarButton>
  )

  return (
    <>
      <Sheet
        open={open}
        onClose={onClose}
        large
        bare
        title={sub ? sub.title : title}
        leading={sub ? backToMain : <BarButton onClick={onClose}>{t('common.cancel')}</BarButton>}
        trailing={
          sub ? null : (
            <BarButton strong onClick={submit} disabled={!valid || save.isPending}>
              {editing ? t('common.save') : t('txForm.done')}
            </BarButton>
          )
        }
      >
        <AnimatePresence initial={false} custom={direction}>
          <motion.div
            key={page}
            custom={direction}
            variants={stackVariants}
            initial="enter"
            animate="center"
            exit="exit"
            className="absolute inset-0 bg-bg"
          >
            {sub ? sub.body : main}
          </motion.div>
        </AnimatePresence>
      </Sheet>

      <DatePickerSheet
        open={dateFor !== null}
        value={dateFor === 'cheque' ? form.chequeDueOn || todayIso() : form.occurredOn}
        title={dateFor === 'cheque' ? t('txForm.chequeDueLabel') : t('txForm.date')}
        onChange={(iso) => update(dateFor === 'cheque' ? { chequeDueOn: iso } : { occurredOn: iso })}
        onClose={() => setDateFor(null)}
      />
      {patient && (
        <TreatmentFormSheet
          key={creatingCase ? 'open' : 'idle'}
          open={creatingCase}
          onClose={() => setCreatingCase(false)}
          patientId={patient.id}
          onSaved={(tr) => {
            update({ treatmentId: tr.id })
            pop()
          }}
        />
      )}
    </>
  )
}
