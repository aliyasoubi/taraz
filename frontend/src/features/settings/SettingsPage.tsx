import { useQueryClient } from '@tanstack/react-query'
import { CalendarClock, ChartColumn, CreditCard, DatabaseBackup, EyeOff } from 'lucide-react'
import { toast } from 'sonner'
import { api, download } from '@/shared/api/client'
import { keys } from '@/shared/api/keys'
import { UNIT_LABEL } from '@/shared/lib/format'
import { t } from '@/shared/lib/i18n'
import { setPref, usePrefs, type Theme } from '@/shared/lib/settings'
import { ListIcon, ListRow, ListSection, PageHeader, Segmented, Toggle } from '@/shared/ui'

/** Laid out like the Settings app: grouped rows, each with its coloured icon. */
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
      <PageHeader back={t('patients.title')} title={t('settings.title')} />
      <div className="px-4">
        <ListSection className="mt-2">
          <ListRow
            to="/accounts"
            icon={
              <ListIcon>
                <CreditCard />
              </ListIcon>
            }
            title={t('nav.accounts')}
            chevron
          />
          <ListRow
            to="/cheques"
            icon={
              <ListIcon tone="warn">
                <CalendarClock />
              </ListIcon>
            }
            title={t('settings.cheques')}
            chevron
          />
          <ListRow
            to="/reports"
            icon={
              <ListIcon tone="info">
                <ChartColumn />
              </ListIcon>
            }
            title={t('reports.title')}
            chevron
          />
        </ListSection>

        <ListSection header={t('settings.unit')} footer={t('settings.unitHint')}>
          <ListRow>
            <Segmented
              className="flex-1"
              value={prefs.unit}
              onChange={(v) => setPref('unit', v)}
              options={[
                { value: 'rial', label: UNIT_LABEL.rial },
                { value: 'toman', label: UNIT_LABEL.toman },
              ]}
            />
          </ListRow>
        </ListSection>

        <ListSection header={t('settings.appearance')}>
          <ListRow>
            <Segmented<Theme>
              className="flex-1"
              value={prefs.theme}
              onChange={(v) => setPref('theme', v)}
              options={[
                { value: 'system', label: t('settings.system') },
                { value: 'light', label: t('settings.light') },
                { value: 'dark', label: t('settings.dark') },
              ]}
            />
          </ListRow>
          <ListRow
            icon={
              <ListIcon tone="gray">
                <EyeOff />
              </ListIcon>
            }
            title={t('settings.hideAmounts')}
            value={
              <Toggle
                checked={prefs.hideAmounts}
                onChange={(v) => setPref('hideAmounts', v)}
                label={t('settings.hideAmounts')}
              />
            }
          />
        </ListSection>

        <ListSection footer={t('settings.backupHint')}>
          <ListRow
            icon={
              <ListIcon tone="credit">
                <DatabaseBackup />
              </ListIcon>
            }
            title={t('settings.backup')}
            onClick={() => download('/export/backup.xlsx')}
          />
        </ListSection>

        <ListSection
          footer={
            <>
              {t('settings.installBefore')} <b>Share</b> {t('settings.installMiddle')} <b>Add to Home Screen</b>{' '}
              {t('settings.installAfter')}
            </>
          }
        >
          <ListRow title={t('settings.logout')} destructive onClick={logout} />
        </ListSection>

        <p className="mt-8 text-center text-[13px] text-ink-3">{t('app.version', { version: __APP_VERSION__ })}</p>
      </div>
    </div>
  )
}
