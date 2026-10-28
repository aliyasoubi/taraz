import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigationType, type NavigationType } from 'react-router'
import { isTabRoot, TabBar } from '@/app/TabBar'
import { Screen, Spinner, stackVariants, type StackDirection } from '@/shared/ui'
import { TransactionSheetsProvider } from '@/features/transactions/TransactionSheets'
import { useMe } from '@/features/auth/api'
import { AccountPage } from '@/features/accounts/AccountPage'
import { AccountsPage } from '@/features/accounts/AccountsPage'
import { ChequesPage } from '@/features/transactions/ChequesPage'
import { LoginPage } from '@/features/auth/LoginPage'
import { MonthPage } from '@/features/reports/MonthPage'
import { PatientPage } from '@/features/patients/PatientPage'
import { PatientsPage } from '@/features/patients/PatientsPage'
import { ReceiptsPage } from '@/features/transactions/ReceiptsPage'
import { ReportsPage } from '@/features/reports/ReportsPage'
import { SettingsPage } from '@/features/settings/SettingsPage'

/** Switching tabs is instant on iOS; going deeper slides in, going back slides out. */
function directionOf(from: string, to: string, type: NavigationType): StackDirection {
  if (isTabRoot(to) && (isTabRoot(from) || type !== 'POP')) return 'none'
  return type === 'POP' ? 'pop' : 'push'
}

function Screens() {
  const location = useLocation()
  const type = useNavigationType()
  // Derived while rendering, so the first frame of a new screen already knows its direction.
  const [nav, setNav] = useState({ path: location.pathname, direction: 'none' as StackDirection })
  if (nav.path !== location.pathname) {
    setNav({ path: location.pathname, direction: directionOf(nav.path, location.pathname, type) })
  }

  return (
    <AnimatePresence initial={false} custom={nav.direction}>
      <motion.div
        key={location.pathname}
        custom={nav.direction}
        variants={stackVariants}
        initial="enter"
        animate="center"
        exit="exit"
        className="absolute inset-0 shadow-[0_0_28px_rgb(0_0_0/0.14)]"
      >
        <Screen id={location.pathname}>
          <Routes location={location}>
            <Route path="/" element={<PatientsPage />} />
            <Route path="/patients/:id" element={<PatientPage />} />
            <Route path="/receipts" element={<ReceiptsPage />} />
            <Route path="/month" element={<MonthPage />} />
            <Route path="/accounts" element={<AccountsPage />} />
            <Route path="/accounts/:id" element={<AccountPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/cheques" element={<ChequesPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Screen>
      </motion.div>
    </AnimatePresence>
  )
}

export function App() {
  const me = useMe()

  if (me.isPending) {
    return (
      <div className="grid min-h-dvh place-items-center text-ink-3">
        <Spinner className="size-7" />
      </div>
    )
  }

  if (!me.data?.authenticated) return <LoginPage />

  return (
    <TransactionSheetsProvider>
      <div className="stage fixed inset-0 overflow-hidden bg-bg">
        <Screens />
        <TabBar />
      </div>
    </TransactionSheetsProvider>
  )
}
