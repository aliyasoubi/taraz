import { motion } from 'motion/react'
import { BarChart3, CreditCard, Home, Plus, Users } from 'lucide-react'
import { NavLink, useLocation } from 'react-router'
import { useTransactionSheets } from '@/features/transactions/TransactionSheets'
import { cx } from '@/shared/lib/cx'
import { Pressable, spring } from '@/shared/ui'
import { t } from '@/shared/lib/i18n'

const TABS = [
  { to: '/', label: t('nav.home'), icon: Home, end: true },
  { to: '/patients', label: t('nav.patients'), icon: Users },
  null, // the add button sits in the middle
  { to: '/accounts', label: t('nav.accounts'), icon: CreditCard },
  { to: '/reports', label: t('nav.reports'), icon: BarChart3 },
] as const

export function TabBar() {
  const { pathname } = useLocation()
  const { newTransaction } = useTransactionSheets()
  const patientMatch = pathname.match(/^\/patients\/(\d+)/)

  return (
    <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-40 pb-safe">
      <div className="pointer-events-auto mx-4 flex max-w-md items-center justify-around rounded-[28px] border border-line-2 px-2 py-1.5 shadow-float glass sm:mx-auto">
        {TABS.map((tab) =>
          tab === null ? (
            <Pressable
              key="add"
              aria-label={t('nav.addTransaction')}
              onClick={() => newTransaction({ patientId: patientMatch ? Number(patientMatch[1]) : undefined })}
              className="relative -my-4 grid size-14 place-items-center rounded-full text-white shadow-[0_10px_30px_-6px] shadow-brand/70 bg-brand-gradient"
              whileTap={{ scale: 0.9, rotate: 90 }}
            >
              <span className="absolute inset-0 animate-ping rounded-full bg-brand/30 [animation-duration:3s]" />
              <Plus className="relative size-7" strokeWidth={2.6} />
            </Pressable>
          ) : (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={'end' in tab ? tab.end : false}
              className="relative flex w-16 flex-col items-center gap-0.5 rounded-2xl py-1.5"
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.span
                      layoutId="tab-pill"
                      transition={spring}
                      className="absolute inset-0 rounded-2xl bg-brand/12"
                    />
                  )}
                  <tab.icon
                    className={cx('relative size-[22px] transition-colors', isActive ? 'text-brand' : 'text-ink-3')}
                    strokeWidth={isActive ? 2.4 : 2}
                  />
                  <span className={cx('relative text-[10.5px] font-semibold', isActive ? 'text-ink' : 'text-ink-3')}>
                    {tab.label}
                  </span>
                </>
              )}
            </NavLink>
          ),
        )}
      </div>
    </nav>
  )
}

export const TAB_BAR_SPACE = 'pb-32'
