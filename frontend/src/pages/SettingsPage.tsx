import { useQueryClient } from '@tanstack/react-query'
import { CalendarClock, ChevronLeft, DatabaseBackup, EyeOff, LogOut, Moon, Smartphone, Sun, SunMoon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { PageHeader } from '@/components/PageHeader'
import { Card, cx, Pressable, Segmented } from '@/components/ui'
import { api, download } from '@/lib/api'
import { UNIT_LABEL } from '@/lib/format'
import { keys } from '@/lib/queries'
import { setPref, usePrefs, type Theme } from '@/lib/settings'
import { t } from '@/lib/i18n'

export function SettingsPage() {
  const prefs = usePrefs()
  const qc = useQueryClient()

  const logout = async () => {
    await api.post('/auth/logout').catch(() => undefined)
    qc.clear()
    qc.setQueryData(keys.me, null)
    toast.success(t('settings.loggedOut'))
  }

  return (
    <div>
      <PageHeader back title={t('settings.title')} />
      <div className="space-y-5 px-4">
        <Card className="space-y-5 p-4">
          <Setting label={t('settings.unit')} hint={t('settings.unitHint')}>
            <Segmented
              value={prefs.unit}
              onChange={(v) => setPref('unit', v)}
              options={[
                { value: 'rial', label: UNIT_LABEL.rial },
                { value: 'toman', label: UNIT_LABEL.toman },
              ]}
            />
          </Setting>
          <Setting label={t('settings.appearance')}>
            <Segmented<Theme>
              value={prefs.theme}
              onChange={(v) => setPref('theme', v)}
              options={[
                { value: 'dark', label: <Icon icon={<Moon className="size-4" />}>{t('settings.dark')}</Icon> },
                { value: 'light', label: <Icon icon={<Sun className="size-4" />}>{t('settings.light')}</Icon> },
                { value: 'system', label: <Icon icon={<SunMoon className="size-4" />}>{t('settings.system')}</Icon> },
              ]}
            />
          </Setting>
          <button
            type="button"
            onClick={() => setPref('hideAmounts', !prefs.hideAmounts)}
            className="flex w-full items-center justify-between"
          >
            <span className="flex items-center gap-3 text-sm font-semibold">
              <EyeOff className="size-5 text-ink-3" /> {t('settings.hideAmounts')}
            </span>
            <span
              className={cx(
                'relative h-7 w-12 rounded-full transition-colors',
                prefs.hideAmounts ? 'bg-brand' : 'bg-line-2',
              )}
            >
              <span
                className={cx(
                  'absolute top-0.5 size-6 rounded-full bg-white shadow transition-all',
                  prefs.hideAmounts ? 'start-[22px]' : 'start-0.5',
                )}
              />
            </span>
          </button>
        </Card>

        <Card className="divide-y divide-line">
          <Row icon={<CalendarClock className="size-5 text-warn" />} label={t('settings.cheques')} to="/cheques" />
          <Row
            icon={<DatabaseBackup className="size-5 text-credit" />}
            label={t('settings.backup')}
            hint={t('settings.backupHint')}
            onClick={() => download('/export/backup.xlsx')}
          />
        </Card>

        <Card className="p-4">
          <div className="flex items-start gap-3">
            <Smartphone className="mt-0.5 size-5 shrink-0 text-brand" />
            <p className="text-[13px] leading-7 text-ink-2">
              {t('settings.installBefore')} <b>Share</b> {t('settings.installMiddle')} <b>Add to Home Screen</b>{' '}
              {t('settings.installAfter')}
            </p>
          </div>
        </Card>

        <Pressable
          onClick={logout}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-debt/25 bg-debt/10 py-3.5 font-semibold text-debt"
        >
          <LogOut className="size-5" /> {t('settings.logout')}
        </Pressable>
        <p className="pb-4 text-center text-[11px] text-ink-3">{t('app.version', { version: __APP_VERSION__ })}</p>
      </div>
    </div>
  )
}

function Icon({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {icon}
      {children}
    </span>
  )
}

function Setting({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-sm font-semibold">{label}</p>
      {children}
      {hint && <p className="mt-1.5 text-[11px] text-ink-3">{hint}</p>}
    </div>
  )
}

function Row({ icon, label, hint, to, onClick }: { icon: ReactNode; label: string; hint?: string; to?: string; onClick?: () => void }) {
  const body = (
    <div className="flex items-center gap-3 px-4 py-3.5">
      {icon}
      <div className="flex-1 text-start">
        <p className="text-sm font-semibold">{label}</p>
        {hint && <p className="text-[11px] text-ink-3">{hint}</p>}
      </div>
      <ChevronLeft className="size-4 text-ink-3" />
    </div>
  )
  return to ? (
    <Link to={to} className="block">
      {body}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className="block w-full">
      {body}
    </button>
  )
}
