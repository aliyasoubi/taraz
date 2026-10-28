import { initials } from '@/shared/lib/text'
import { cx } from '@/shared/lib/cx'

/** A monogram on the grey gradient of Apple's Contacts. */
export function Avatar({ name, size = 40, className }: { name: string; size?: number; className?: string }) {
  return (
    <div
      className={cx('grid shrink-0 place-items-center rounded-full font-semibold text-white', className)}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.4,
        background: 'linear-gradient(180deg, #a5abb8, #858994)',
      }}
      aria-hidden
    >
      {initials(name)}
    </div>
  )
}
