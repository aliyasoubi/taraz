import { motion, useScroll, useTransform } from 'motion/react'
import { ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { IconButton } from './ui'
import { t } from '@/lib/i18n'

/** iOS-style large title that condenses into a glass bar as the page scrolls. */
export function PageHeader({
  title,
  subtitle,
  back,
  actions,
}: {
  title: ReactNode
  subtitle?: ReactNode
  back?: boolean
  actions?: ReactNode
}) {
  const navigate = useNavigate()
  const { scrollY } = useScroll()
  const barOpacity = useTransform(scrollY, [30, 70], [0, 1])
  const bigOpacity = useTransform(scrollY, [0, 50], [1, 0])
  const bigY = useTransform(scrollY, [0, 60], [0, -8])

  return (
    <>
      <div className="sticky top-0 z-30 pt-safe">
        <motion.div style={{ opacity: barOpacity }} className="glass absolute inset-0 border-b border-line" />
        <div className="relative flex h-12 items-center justify-between gap-2 px-4">
          <div className="flex min-w-10 items-center">
            {back && (
              <IconButton onClick={() => (history.length > 1 ? navigate(-1) : navigate('/'))} aria-label={t('common.back')}>
                <ChevronRight className="size-5" />
              </IconButton>
            )}
          </div>
          <motion.div style={{ opacity: barOpacity }} className="min-w-0 flex-1 truncate text-center text-[15px] font-bold">
            {title}
          </motion.div>
          <div className="flex min-w-10 items-center justify-end gap-2">{actions}</div>
        </div>
      </div>
      <motion.div style={{ opacity: bigOpacity, y: bigY }} className="px-5 pb-2 pt-1">
        <h1 className="text-[30px] font-extrabold leading-tight tracking-tight">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-ink-3">{subtitle}</p>}
      </motion.div>
    </>
  )
}
