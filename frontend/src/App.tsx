import { AnimatePresence, motion } from 'motion/react'
import { useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router'
import { TabBar } from './components/TabBar'
import { Spinner } from './components/ui'
import { LedgerUIProvider } from './ledger-ui'
import { useMe } from './lib/queries'
import { AccountPage } from './pages/AccountPage'
import { AccountsPage } from './pages/AccountsPage'
import { ChequesPage } from './pages/ChequesPage'
import { HomePage } from './pages/HomePage'
import { LoginPage } from './pages/LoginPage'
import { PatientPage } from './pages/PatientPage'
import { PatientsPage } from './pages/PatientsPage'
import { ReportsPage } from './pages/ReportsPage'
import { SettingsPage } from './pages/SettingsPage'

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
    <LedgerUIProvider>
      <Aurora />
      <Screens />
      <TabBar />
    </LedgerUIProvider>
  )
}
