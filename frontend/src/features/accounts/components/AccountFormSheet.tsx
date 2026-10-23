import { useState } from 'react'
import { toast } from 'sonner'
import { useSaveAccount, type AccountInput } from '@/features/accounts/api'
import { AccountCard } from '@/features/accounts/components/AccountCard'
import type { Account, AccountKind } from '@/shared/api/types'
import { cx } from '@/shared/lib/cx'
import { errorMessage } from '@/shared/lib/errors'
import { digitsOnly } from '@/shared/lib/format'
import { t } from '@/shared/lib/i18n'
import { ACCOUNT_COLORS, ACCOUNT_KIND_LABEL, BANKS } from '@/shared/lib/labels'
import { Button, Chip, Field, Pressable, Sheet, TextInput } from '@/shared/ui'

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
        <Field
          label={t('accountForm.owner')}
          hint={form.kind === 'third_party' ? t('accountForm.ownerThirdPartyHint') : undefined}
        >
          <TextInput
            value={form.owner_name ?? ''}
            onChange={(e) => set('owner_name', e.target.value)}
            placeholder={t('accountForm.ownerPlaceholder')}
          />
        </Field>
        <div>
          <span className="mb-2 block text-[13px] font-medium text-ink-2">{t('accountForm.bank')}</span>
          <div className="-mx-5 no-scrollbar flex gap-2 overflow-x-auto px-5 pb-1">
            {BANKS.map((b) => (
              <Chip key={b} active={form.bank === b} onClick={() => set('bank', form.bank === b ? '' : b)}>
                {b}
              </Chip>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('accountForm.cardTitle')}>
            <TextInput
              value={form.title ?? ''}
              onChange={(e) => set('title', e.target.value)}
              placeholder={autoTitle || t('common.optional')}
            />
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
                className={cx(
                  'size-10 rounded-full ring-offset-2 ring-offset-surface',
                  form.color === key && 'ring-2 ring-ink',
                )}
                style={{ background: `linear-gradient(135deg, ${a}, ${b})` }}
              />
            ))}
          </div>
        </div>
      </div>
    </Sheet>
  )
}
