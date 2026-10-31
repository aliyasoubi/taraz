import { CalendarDays, Table2, Users } from 'lucide-react'
import { Link, useLocation } from 'react-router'
import { cx } from '@/shared/lib/cx'
import { t } from '@/shared/lib/i18n'

// First tab sits on the right, as iOS lays tab bars out in right-to-left languages.
const TABS = [
  // A patient, settings, accounts and cheques are all reached from the patients tab.
  { to: '/', label: t('nav.patients'), icon: Users },
  { to: '/sheet', label: t('nav.sheet'), icon: Table2 },
  { to: '/month', label: t('nav.month'), icon: CalendarDays },
] as const

function tabOf(path: string): string {
  return TABS.find((tab) => tab.to !== '/' && path.startsWith(tab.to))?.to ?? '/'
}

/** The iOS tab bar. Tapping the current tab returns to its first screen. */
export function TabBar() {
  const { pathname } = useLocation()
  const current = tabOf(pathname)

  return (
    <nav className="absolute inset-x-0 bottom-0 z-40 pb-[max(env(safe-area-inset-bottom),6px)] hairline-t glass">
      <div className="mx-auto flex h-[50px] max-w-xl">
        {TABS.map((tab) => {
          const active = current === tab.to
          return (
            <Link
              key={tab.to}
              to={tab.to}
              aria-current={active ? 'page' : undefined}
              className={cx(
                'flex flex-1 flex-col items-center justify-center gap-0.5 pt-1 transition-colors',
                active ? 'text-brand' : 'text-ink-2',
              )}
            >
              <tab.icon className="size-[25px]" strokeWidth={active ? 2.2 : 1.8} />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
