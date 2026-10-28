import { Search, X } from 'lucide-react'
import { cx } from '@/shared/lib/cx'
import { t } from '@/shared/lib/i18n'

/** The iOS search bar: a grey capsule with a magnifier and a clear button. */
export function SearchField({
  value,
  onChange,
  placeholder,
  autoFocus,
  className,
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
  autoFocus?: boolean
  className?: string
}) {
  return (
    <div className={cx('relative', className)}>
      <Search className="pointer-events-none absolute start-2 top-1/2 size-[18px] -translate-y-1/2 text-ink-2" />
      <input
        type="search"
        enterKeyHint="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="h-9 w-full rounded-[10px] bg-fill ps-8 pe-8 text-[17px] caret-brand outline-none placeholder:text-ink-2 [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute end-2 top-1/2 grid size-[18px] -translate-y-1/2 place-items-center rounded-full bg-ink-3 text-surface"
          aria-label={t('common.clear')}
        >
          <X className="size-3" strokeWidth={3} />
        </button>
      )}
    </div>
  )
}
