import { motion } from 'motion/react'
import { Archive, ArchiveRestore, BadgePercent, Banknote, FolderPlus, Pencil, Phone, Stethoscope, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { Avatar } from '@/components/Avatar'
import { ConfirmSheet } from '@/components/ConfirmSheet'
import { errorMessage, PatientFormSheet, TreatmentFormSheet } from '@/components/forms'
import { AnimatedMoney, Money } from '@/components/Money'
import { PageHeader } from '@/components/PageHeader'
import { Sheet } from '@/components/Sheet'
import { TxRow } from '@/components/TxRow'
import { Badge, Card, cx, Empty, IconButton, listVariants, Pressable, SectionTitle, Skeleton } from '@/components/ui'
import { faDigits, TONE_LABEL, balanceTone } from '@/lib/format'
import { monthKey, monthLabel } from '@/lib/jalali'
import { TREATMENT_LABEL } from '@/lib/labels'
import { useDeletePatient, usePatient, usePatientTransactions, useSavePatient } from '@/lib/queries'
import type { Transaction, Treatment } from '@/lib/types'
import { useLedgerUI } from '@/ledger-ui'

function effect(tx: Transaction): number {
  if (!tx.counts) return 0
  return tx.type === 'charge' || tx.type === 'refund' ? tx.amount : -tx.amount
}

export function PatientPage() {
  const id = Number(useParams().id)
  const navigate = useNavigate()
  const { data: p, isLoading } = usePatient(id)
  const { data: txs } = usePatientTransactions(id)
  const { newTransaction } = useLedgerUI()
  const [filter, setFilter] = useState<number | 'all'>('all')
  const [sheet, setSheet] = useState<null | 'edit' | 'menu' | 'delete' | 'treatment' | { treatment: Treatment }>(null)
  const savePatient = useSavePatient()
  const deletePatient = useDeletePatient()

  // Running balance, like the «مانده حساب» column the spreadsheet kept by hand.
  const groups = useMemo(() => {
    const list = (txs ?? []).filter((t) => filter === 'all' || t.treatment_id === filter)
    const chrono = [...list].sort((a, b) => a.occurred_on.localeCompare(b.occurred_on) || a.id - b.id)
    const running = new Map<number, number>()
    let acc = 0
    for (const t of chrono) {
      acc += effect(t)
      running.set(t.id, acc)
    }
    const byMonth = new Map<string, Transaction[]>()
    for (const t of list) {
      const k = monthKey(t.occurred_on)
      byMonth.set(k, [...(byMonth.get(k) ?? []), t])
    }
    return { running, months: [...byMonth.entries()] }
  }, [txs, filter])

  if (isLoading || !p) {
    return (
      <div className="px-4 pt-safe">
        <Skeleton className="mt-16 h-56 rounded-[30px]" />
        <Skeleton className="mt-4 h-24" />
        <Skeleton className="mt-4 h-64" />
      </div>
    )
  }

  const tone = balanceTone(p.balance)
  const selected = filter === 'all' ? null : p.treatments.find((t) => t.id === filter)
  const view = selected ?? p
  const progress = view.charged > 0 ? Math.min(1, (view.paid + view.discounted) / view.charged) : 0
  const preset = { patientId: p.id, treatmentId: selected?.id }

  return (
    <div>
      <PageHeader
        back
        title={p.name}
        actions={
          <IconButton onClick={() => setSheet('menu')} aria-label="گزینه‌ها">
            <Pencil className="size-[18px]" />
          </IconButton>
        }
      />

      <div className="px-4">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className={cx(
            'relative overflow-hidden rounded-[30px] border p-5',
            tone === 'debt' && 'border-debt/25 bg-gradient-to-br from-debt/18 via-surface to-surface',
            tone === 'credit' && 'border-credit/25 bg-gradient-to-br from-credit/18 via-surface to-surface',
            tone === 'settled' && 'border-line bg-gradient-to-br from-brand/14 via-surface to-surface',
          )}
        >
          <div className="flex items-center gap-3">
            <Avatar name={p.name} size={54} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <Badge tone={tone === 'settled' ? 'neutral' : tone}>{TONE_LABEL[tone]}</Badge>
                {p.is_archived && <Badge>بایگانی</Badge>}
              </div>
              {p.phone && (
                <a href={`tel:${p.phone}`} className="mt-1 inline-flex items-center gap-1 text-[13px] text-ink-3" dir="ltr">
                  <Phone className="size-3.5" /> {faDigits(p.phone)}
                </a>
              )}
            </div>
          </div>

          <p className="mt-5 text-[13px] text-ink-3">{selected ? `مانده ${selected.title}` : 'مانده حساب'}</p>
          <AnimatedMoney
            value={Math.abs(view.balance)}
            maxSize={38}
            className={cx(
              'font-black leading-tight tracking-tight',
              view.balance > 0 ? 'text-debt' : view.balance < 0 ? 'text-credit' : 'text-ink',
            )}
          />
          {view.pending_cheques > 0 && (
            <p className="mt-1 text-[12px] text-warn">
              <Money value={view.pending_cheques} className="font-semibold" /> چک در انتظار وصول — پس از وصول:{' '}
              <Money value={view.balance - view.pending_cheques} tone="auto" className="font-semibold" />
            </p>
          )}

          <div className="mt-4">
            <div className="h-2 overflow-hidden rounded-full bg-line">
              <motion.div
                className="h-full rounded-full bg-gradient-to-l from-credit to-info"
                initial={{ width: 0 }}
                animate={{ width: `${progress * 100}%` }}
                transition={{ type: 'spring', stiffness: 80, damping: 20, delay: 0.2 }}
              />
            </div>
            <div className="mt-2 flex justify-between text-[12px] text-ink-3">
              <span>
                پرداخت‌شده <Money value={view.paid} className="font-semibold text-ink-2" unit={false} />
              </span>
              <span>
                کل هزینه <Money value={view.charged} className="font-semibold text-ink-2" unit={false} />
              </span>
            </div>
          </div>
        </motion.div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <QuickAction
            icon={<Banknote className="size-5" />}
            label="ثبت پرداخت"
            className="text-credit"
            onClick={() => newTransaction({ ...preset, type: 'payment' })}
          />
          <QuickAction
            icon={<Stethoscope className="size-5" />}
            label="ثبت هزینه"
            className="text-debt"
            onClick={() => newTransaction({ ...preset, type: 'charge' })}
          />
          <QuickAction
            icon={<BadgePercent className="size-5" />}
            label="تخفیف"
            className="text-info"
            onClick={() => newTransaction({ ...preset, type: 'discount' })}
          />
        </div>

        <SectionTitle>پرونده‌های درمان</SectionTitle>
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          <TreatmentTile active={filter === 'all'} title="همه" subtitle={`${faDigits(p.tx_count)} تراکنش`} balance={p.balance} onClick={() => setFilter('all')} />
          {p.treatments.map((t) => (
            <TreatmentTile
              key={t.id}
              active={filter === t.id}
              title={t.title}
              subtitle={[TREATMENT_LABEL[t.kind], t.doctor].filter(Boolean).join(' · ')}
              balance={t.balance}
              done={t.status === 'completed'}
              onClick={() => (filter === t.id ? setSheet({ treatment: t }) : setFilter(t.id))}
            />
          ))}
          <Pressable
            onClick={() => setSheet('treatment')}
            className="grid w-28 shrink-0 place-items-center rounded-3xl border border-dashed border-line-2 py-3 text-ink-3"
          >
            <span className="flex flex-col items-center gap-1 text-xs font-semibold">
              <FolderPlus className="size-5" /> پرونده جدید
            </span>
          </Pressable>
        </div>
        {selected && <p className="mt-1 px-1 text-[11px] text-ink-3">برای ویرایش پرونده، دوباره روی آن بزنید.</p>}

        <SectionTitle>گردش حساب</SectionTitle>
        {!txs ? (
          <Skeleton className="h-48" />
        ) : groups.months.length === 0 ? (
          <Card>
            <Empty
              icon={<Banknote className="size-7" />}
              title="هنوز تراکنشی ثبت نشده"
              hint="هزینه درمان یا پرداخت بیمار را ثبت کنید تا مانده محاسبه شود"
            />
          </Card>
        ) : (
          <div className="space-y-4">
            {groups.months.map(([key, list]) => {
              const [jy, jm] = key.split('-').map(Number)
              const net = list.reduce((s, t) => s + effect(t), 0)
              return (
                <Card key={key} className="p-1.5">
                  <div className="flex items-center justify-between px-3 pb-1 pt-2.5">
                    <span className="text-[13px] font-bold text-ink-2">{monthLabel(jy!, jm!)}</span>
                    <span className="text-[12px] text-ink-3">
                      تغییر مانده <Money value={net} sign tone="auto" unit={false} className="font-semibold" />
                    </span>
                  </div>
                  <motion.div variants={listVariants} initial="hidden" animate="show">
                    {list.map((tx) => (
                      <TxRow key={tx.id} tx={tx} runningBalance={groups.running.get(tx.id)} />
                    ))}
                  </motion.div>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      <Sheet open={sheet === 'menu'} onClose={() => setSheet(null)} title={p.name}>
        <div className="space-y-2">
          <MenuItem icon={<Pencil className="size-5" />} label="ویرایش اطلاعات" onClick={() => setSheet('edit')} />
          <MenuItem
            icon={p.is_archived ? <ArchiveRestore className="size-5" /> : <Archive className="size-5" />}
            label={p.is_archived ? 'خروج از بایگانی' : 'بایگانی (پنهان از فهرست)'}
            onClick={() =>
              savePatient.mutate(
                { id: p.id, data: { is_archived: !p.is_archived } },
                {
                  onSuccess: () => {
                    toast.success(p.is_archived ? 'از بایگانی خارج شد' : 'بایگانی شد')
                    setSheet(null)
                  },
                  onError: (e) => toast.error(errorMessage(e)),
                },
              )
            }
          />
          <MenuItem icon={<Trash2 className="size-5" />} label="حذف بیمار و همه تراکنش‌ها" danger onClick={() => setSheet('delete')} />
        </div>
      </Sheet>

      <PatientFormSheet key={sheet === 'edit' ? 'edit' : 'edit-idle'} open={sheet === 'edit'} patient={p} onClose={() => setSheet(null)} />
      <TreatmentFormSheet
        key={typeof sheet === 'object' && sheet ? `t${sheet.treatment.id}` : sheet === 'treatment' ? 'new' : 'treatment-idle'}
        open={sheet === 'treatment' || (typeof sheet === 'object' && sheet !== null)}
        patientId={p.id}
        treatment={typeof sheet === 'object' && sheet ? sheet.treatment : undefined}
        onClose={() => setSheet(null)}
        onSaved={(t) => setFilter(t.id)}
      />
      <ConfirmSheet
        open={sheet === 'delete'}
        onClose={() => setSheet(null)}
        loading={deletePatient.isPending}
        title={`حذف ${p.name}؟`}
        message={`${faDigits(p.tx_count)} تراکنش این بیمار هم برای همیشه حذف می‌شود. اگر فقط می‌خواهید از فهرست پنهان شود، «بایگانی» را انتخاب کنید.`}
        onConfirm={() =>
          deletePatient.mutate(p.id, {
            onSuccess: () => {
              toast.success('بیمار حذف شد')
              navigate('/patients', { replace: true })
            },
            onError: (e) => toast.error(errorMessage(e)),
          })
        }
      />
    </div>
  )
}

function QuickAction({ icon, label, onClick, className }: { icon: React.ReactNode; label: string; onClick: () => void; className?: string }) {
  return (
    <Pressable onClick={onClick} className="flex flex-col items-center gap-1.5 rounded-3xl border border-line bg-surface/80 py-3.5">
      <span className={cx('grid size-10 place-items-center rounded-2xl bg-current/10', className)}>
        <span className={className}>{icon}</span>
      </span>
      <span className="text-[12px] font-semibold text-ink-2">{label}</span>
    </Pressable>
  )
}

function TreatmentTile({
  active,
  title,
  subtitle,
  balance,
  done,
  onClick,
}: {
  active: boolean
  title: string
  subtitle: string
  balance: number
  done?: boolean
  onClick: () => void
}) {
  return (
    <Pressable
      onClick={onClick}
      className={cx(
        'w-36 shrink-0 rounded-3xl border p-3 text-start transition-colors',
        active ? 'border-brand/50 bg-brand/12' : 'border-line bg-surface/70',
      )}
    >
      <div className="flex items-center gap-1.5">
        <p className="truncate text-[14px] font-bold">{title}</p>
        {done && <Badge tone="credit">پایان</Badge>}
      </div>
      <p className="mt-0.5 truncate text-[11px] text-ink-3">{subtitle || ' '}</p>
      <Money value={balance} tone="auto" compact className="mt-2 block text-[13px] font-bold" />
    </Pressable>
  )
}

function MenuItem({ icon, label, onClick, danger }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <Pressable
      onClick={onClick}
      className={cx(
        'flex w-full items-center gap-3 rounded-2xl border border-line bg-surface-2/60 px-4 py-3.5 text-start font-semibold',
        danger ? 'text-debt' : 'text-ink',
      )}
    >
      {icon}
      {label}
    </Pressable>
  )
}
