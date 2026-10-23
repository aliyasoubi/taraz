import { cx } from '@/shared/lib/cx'
import { Money, Skeleton } from '@/shared/ui'

export function Kpi({ label, value, tone }: { label: string; value: number | undefined; tone?: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface-2/60 px-3 py-2.5">
      <p className="text-[11px] text-ink-3">{label}</p>
      {value === undefined ? (
        <Skeleton className="mt-1 h-5 w-20" />
      ) : (
        <Money value={value} compact className={cx('mt-0.5 block text-[15px] font-bold', tone)} />
      )}
    </div>
  )
}
