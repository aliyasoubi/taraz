import { Navigator } from '@/app/Navigator'
import { TabBar } from '@/app/TabBar'
import { Spinner } from '@/shared/ui'
import { TransactionSheetsProvider } from '@/features/transactions/TransactionSheets'
import { useMe } from '@/features/auth/api'
import { LoginPage } from '@/features/auth/LoginPage'

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
        <Navigator />
        <TabBar />
      </div>
    </TransactionSheetsProvider>
  )
}
