import type { ReactNode } from 'react'

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mt-7 mb-3 flex items-center justify-between px-1">
      <h2 className="text-[15px] font-bold text-ink">{children}</h2>
      {action}
    </div>
  )
}
