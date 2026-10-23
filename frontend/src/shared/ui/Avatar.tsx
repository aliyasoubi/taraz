import { hueOf, initials } from '@/shared/lib/text'
import { cx } from '@/shared/lib/cx'

export function Avatar({ name, size = 44, className }: { name: string; size?: number; className?: string }) {
  const h = hueOf(name)
  return (
    <div
      className={cx('grid shrink-0 place-items-center rounded-full font-bold text-white shadow-inner', className)}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.36,
        background: `linear-gradient(140deg, hsl(${h} 70% 58%), hsl(${(h + 48) % 360} 72% 42%))`,
      }}
      aria-hidden
    >
      {initials(name)}
    </div>
  )
}
