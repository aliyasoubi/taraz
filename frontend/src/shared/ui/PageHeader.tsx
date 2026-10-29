import { motion, useScroll, useTransform } from 'motion/react'
import { ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { t } from '@/shared/lib/i18n'
import { Pressable } from './Pressable'
import { useScreenScroll } from './Screen'

/**
 * The iOS navigation bar. With `large` (the default) the title sits big under the
 * bar and, once it scrolls away, reappears small in the middle as the bar turns
 * translucent. Without it, the small title shows from `titleAfter` pixels on.
 */
export function PageHeader({
  title,
  subtitle,
  back,
  actions,
  large = true,
  titleAfter,
  children,
}: {
  title: ReactNode
  subtitle?: ReactNode
  /** Show a back button; a string is its label (iOS names the screen you return to). */
  back?: boolean | string
  actions?: ReactNode
  large?: boolean
  titleAfter?: number
  /** Under the large title, e.g. a search field. */
  children?: ReactNode
}) {
  const navigate = useNavigate()
  const location = useLocation()
  const container = useScreenScroll()
  const { scrollY } = useScroll(container ? { container } : undefined)
  const threshold = large ? 44 : (titleAfter ?? -1)
  const barOpacity = useTransform(scrollY, [threshold, threshold + 12], [0, 1])
  const titleOpacity = useTransform(scrollY, [threshold + 4, threshold + 16], [0, 1])

  const goBack = () => (location.key !== 'default' ? navigate(-1) : navigate('/'))

  return (
    <>
      <div className="sticky top-0 z-30 pt-safe">
        <motion.div style={{ opacity: barOpacity }} className="absolute inset-0 hairline-b glass" />
        <div className="relative grid h-11 grid-cols-[1fr_auto_1fr] items-center px-2">
          <div className="flex min-w-0 justify-start">
            {back && (
              <Pressable
                onClick={goBack}
                className="-ms-1 flex h-11 min-w-0 items-center gap-0.5 pe-2 text-[17px] text-brand"
                aria-label={t('common.back')}
              >
                <ChevronRight className="size-7 shrink-0" strokeWidth={2.4} />
                <span className="truncate">{typeof back === 'string' ? back : t('common.back')}</span>
              </Pressable>
            )}
          </div>
          <motion.div
            style={{ opacity: titleOpacity }}
            className="max-w-[55vw] truncate text-center text-[17px] font-semibold"
          >
            {title}
          </motion.div>
          <div className="flex items-center justify-end gap-1">{actions}</div>
        </div>
      </div>
      {large && (
        <div className="px-4 pt-0.5 pb-2">
          <h1 className="text-[34px] leading-[41px] font-bold tracking-tight">{title}</h1>
          {subtitle && <p className="mt-0.5 text-[15px] text-ink-2">{subtitle}</p>}
        </div>
      )}
      {children && <div className="px-4 pb-3">{children}</div>}
    </>
  )
}
