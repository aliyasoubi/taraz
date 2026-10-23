import { motion } from 'motion/react'
import { CreditCard, Plus } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { AccountCard } from '@/components/AccountCard'
import { AccountFormSheet } from '@/components/forms'
import { Money } from '@/components/Money'
import { PageHeader } from '@/components/PageHeader'
import { Button, Empty, IconButton, Skeleton } from '@/components/ui'
import { useAccounts } from '@/lib/queries'

export function AccountsPage() {
  const { data, isLoading } = useAccounts()
  const [adding, setAdding] = useState(false)
  const active = (data ?? []).filter((a) => !a.is_archived)
  const archived = (data ?? []).filter((a) => a.is_archived)
  const monthTotal = active.reduce((s, a) => s + a.received_this_month, 0)

  return (
    <div>
      <PageHeader
        title="حساب‌های مقصد"
        subtitle="هر پرداخت به کدام حساب رفته است"
        actions={
          <IconButton onClick={() => setAdding(true)} aria-label="حساب جدید" className="text-brand">
            <Plus className="size-5" />
          </IconButton>
        }
      />
      <div className="px-4">
        {data && active.length > 0 && (
          <div className="mb-4 flex items-center justify-between rounded-3xl border border-line bg-surface/70 px-4 py-3">
            <span className="text-sm text-ink-2">جمع واریزی این ماه</span>
            <Money value={monthTotal} tone="credit" className="text-lg font-extrabold" />
          </div>
        )}

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="aspect-[1.6] rounded-[26px]" />
            <Skeleton className="aspect-[1.6] rounded-[26px]" />
          </div>
        ) : active.length === 0 ? (
          <Empty
            icon={<CreditCard className="size-7" />}
            title="هنوز حسابی تعریف نشده"
            hint="کارت‌ها، کارتخوان، صندوق یا حساب اشخاص ثالث (مثل آقای قمی) را اضافه کنید تا مقصد هر پرداخت مشخص باشد"
            action={<Button onClick={() => setAdding(true)}>افزودن اولین حساب</Button>}
          />
        ) : (
          <div className="space-y-4">
            {active.map((a, i) => (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, y: 40, rotateX: 18 }}
                animate={{ opacity: 1, y: 0, rotateX: 0 }}
                transition={{ type: 'spring', stiffness: 160, damping: 20, delay: i * 0.06 }}
                whileTap={{ scale: 0.98 }}
                style={{ transformPerspective: 900 }}
              >
                <Link to={`/accounts/${a.id}`} className="block">
                  <AccountCard account={a} />
                </Link>
              </motion.div>
            ))}
          </div>
        )}

        {archived.length > 0 && (
          <div className="mt-8">
            <p className="mb-2 px-1 text-[13px] font-bold text-ink-3">بایگانی</p>
            <div className="space-y-2">
              {archived.map((a) => (
                <Link
                  key={a.id}
                  to={`/accounts/${a.id}`}
                  className="flex items-center justify-between rounded-2xl border border-line bg-surface/60 px-4 py-3 text-sm"
                >
                  <span className="text-ink-2">{a.title}</span>
                  <Money value={a.received_total} compact className="text-ink-3" />
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
      <AccountFormSheet key={adding ? 'open' : 'closed'} open={adding} onClose={() => setAdding(false)} />
    </div>
  )
}
