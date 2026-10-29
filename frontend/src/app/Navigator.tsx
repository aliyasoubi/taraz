import { animate, AnimatePresence, motion, useMotionValue, useTransform } from 'motion/react'
import { useLayoutEffect, useRef, useState, type PointerEvent } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate, useNavigationType } from 'react-router'
import { directionOf, nextStack, swipeCompletes } from '@/app/navigation'
import { iosEase, Screen, stackVariants, type StackDirection } from '@/shared/ui'
import { AccountPage } from '@/features/accounts/AccountPage'
import { AccountsPage } from '@/features/accounts/AccountsPage'
import { ChequesPage } from '@/features/transactions/ChequesPage'
import { MonthPage } from '@/features/reports/MonthPage'
import { PatientPage } from '@/features/patients/PatientPage'
import { PatientsPage } from '@/features/patients/PatientsPage'
import { ReceiptsPage } from '@/features/transactions/ReceiptsPage'
import { ReportsPage } from '@/features/reports/ReportsPage'
import { SettingsPage } from '@/features/settings/SettingsPage'

function AppRoutes({ location }: { location: string }) {
  return (
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
  )
}

const SETTLE = { duration: 0.35, ease: iosEase }

/**
 * The screens, stacked as in a UINavigationController. A screen pushed on top
 * can be dragged off from the right edge (the leading edge in Persian) to go
 * back, with the screen beneath following it in, as iOS does.
 */
export function Navigator() {
  const location = useLocation()
  const type = useNavigationType()
  const navigate = useNavigate()
  const path = location.pathname

  // Derived while rendering, so the first frame of a new screen already knows its direction.
  const [nav, setNav] = useState({
    path,
    direction: 'none' as StackDirection,
    stack: [path],
    /** A swipe already moved the screens; the route change must not animate again. */
    swiped: false,
    dragging: false,
  })
  if (nav.path !== path) {
    setNav({
      path,
      direction: nav.swiped ? 'none' : directionOf(nav.path, path, type),
      stack: nextStack(nav.stack, path, type),
      swiped: false,
      dragging: false,
    })
  }
  const previous = nav.stack.length > 1 ? nav.stack[nav.stack.length - 2]! : null

  const dragX = useMotionValue(0)
  const underX = useTransform(dragX, (x) => (window.innerWidth + x) * 0.3)
  const dim = useTransform(dragX, (x) => 0.12 * (1 + x / window.innerWidth))
  const start = useRef<number | null>(null)

  // A new screen always starts in place.
  useLayoutEffect(() => dragX.set(0), [path, dragX])

  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    if (!previous) return
    e.currentTarget.setPointerCapture(e.pointerId)
    start.current = e.clientX
    setNav((n) => ({ ...n, dragging: true }))
  }
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (start.current === null) return
    dragX.set(Math.max(-window.innerWidth, Math.min(0, e.clientX - start.current)))
  }
  const onUp = () => {
    if (start.current === null) return
    start.current = null
    const width = window.innerWidth
    if (swipeCompletes(dragX.get(), dragX.getVelocity(), width)) {
      void animate(dragX, -width, SETTLE).then(() => {
        setNav((n) => ({ ...n, swiped: true }))
        navigate(-1)
      })
    } else {
      void animate(dragX, 0, SETTLE).then(() => setNav((n) => ({ ...n, dragging: false })))
    }
  }

  return (
    <>
      {nav.dragging && previous && (
        <motion.div className="absolute inset-0 z-0" style={{ x: underX }} aria-hidden>
          <Screen id={previous}>
            <AppRoutes location={previous} />
          </Screen>
          <motion.div className="pointer-events-none absolute inset-0 bg-black" style={{ opacity: dim }} />
        </motion.div>
      )}
      <AnimatePresence initial={false} custom={nav.direction}>
        <motion.div
          key={path}
          custom={nav.direction}
          variants={stackVariants}
          initial="enter"
          animate="center"
          exit="exit"
          className="absolute inset-0"
        >
          <motion.div style={{ x: dragX }} className="absolute inset-0 shadow-[0_0_28px_rgb(0_0_0/0.14)]">
            <Screen id={path}>
              <AppRoutes location={path} />
            </Screen>
          </motion.div>
        </motion.div>
      </AnimatePresence>
      {previous && (
        <div
          className="absolute inset-y-0 right-0 z-30 w-5 touch-none"
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
        />
      )}
    </>
  )
}
