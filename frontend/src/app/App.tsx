import { AnimatePresence, motion } from 'motion/react'
import { useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router'
import { TabBar } from '@/app/TabBar'
import { Spinner } from '@/shared/ui'
import { TransactionSheetsProvider } from '@/features/transactions/TransactionSheets'
import { useMe } from '@/features/auth/api'
import { AccountPage } from '@/features/accounts/AccountPage'
import { AccountsPage } from '@/features/accounts/AccountsPage'
import { ChequesPage } from '@/features/transactions/ChequesPage'
import { HomePage } from '@/features/dashboard/HomePage'
import { LoginPage } from '@/features/auth/LoginPage'
import { PatientPage } from '@/features/patients/PatientPage'
import { PatientsPage } from '@/features/patients/PatientsPage'
import { ReportsPage } from '@/features/reports/ReportsPage'
import { SettingsPage } from '@/features/settings/SettingsPage'

function Aurora() {
  return (
    <div className="aurora" aria-hidden>
      <span />
      <span />
      <span />
    </div>
  )
}

function Screens() {
  const location = useLocation()
  useEffect(() => {
    // Block body on purpose: scrollTo returns a Promise in current engines, and an
    // effect may only return a cleanup function.
    window.scrollTo({ top: 0 })
  }, [location.pathname])
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.main
        key={location.pathname}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className="mx-auto min-h-dvh max-w-xl pb-36"
      >
        <Routes location={location}>
          <Route path="/" element={<HomePage />} />
          <Route path="/patients" element={<PatientsPage />} />
          <Route path="/patients/:id" element={<PatientPage />} />
          <Route path="/accounts" element={<AccountsPage />} />
          <Route path="/accounts/:id" element={<AccountPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/cheques" element={<ChequesPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<HomePage />} />
        </Routes>
      </motion.main>
    </AnimatePresence>
  )
}

export function App() {
  const me = useMe()

  if (me.isPending) {
    return (
      <div className="grid min-h-dvh place-items-center text-brand">
        <Aurora />
        <Spinner className="size-8" />
      </div>
    )
  }

  if (!me.data?.authenticated) {
    return (
      <>
        <Aurora />
        <LoginPage />
      </>
    )
  }

  return (
    <TransactionSheetsProvider>
      <Aurora />
      <Screens />
      <TabBar />
    </TransactionSheetsProvider>
  )
}
