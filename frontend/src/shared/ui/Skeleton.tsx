import { cx } from '@/shared/lib/cx'

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx('shimmer rounded-[12px]', className)} />
}
