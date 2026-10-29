import { useQueryClient } from '@tanstack/react-query'
import { motion } from 'motion/react'
import { Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'
import { api, ApiError } from '@/shared/api/client'
import { keys } from '@/shared/api/keys'
import { Button, iosEase, TextInput } from '@/shared/ui'
import { t } from '@/shared/lib/i18n'

export function LoginPage() {
  const qc = useQueryClient()
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [shake, setShake] = useState(0)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password) return
    setLoading(true)
    setError('')
    try {
      await api.post('/auth/login', { password })
      qc.setQueryData(keys.me, { authenticated: true })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('errors.network'))
      setShake((n) => n + 1)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-bg px-6 pt-safe pb-safe">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: iosEase }}
        className="w-full max-w-sm"
      >
        <div className="mb-10 flex flex-col items-center text-center">
          <img src="/logo.svg" alt="" className="size-[88px] rounded-[22%] shadow-float" />
          <h1 className="mt-5 text-[34px] font-bold tracking-tight">{t('app.name')}</h1>
          <p className="mt-1 text-[15px] text-ink-2">{t('app.tagline')}</p>
        </div>

        <motion.form
          key={shake}
          onSubmit={submit}
          animate={shake ? { x: [0, -12, 10, -6, 4, 0] } : undefined}
          transition={{ duration: 0.45 }}
        >
          <div className="relative">
            <TextInput
              type={show ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('login.password')}
              aria-label={t('login.password')}
              autoComplete="current-password"
              autoFocus
              dir="ltr"
              className="h-[50px] pe-12 text-center placeholder:text-ink-3"
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="absolute end-3 top-1/2 -translate-y-1/2 text-ink-3"
              aria-label={show ? t('login.hidePassword') : t('login.showPassword')}
            >
              {show ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
            </button>
          </div>
          {error && <p className="mt-3 text-center text-[13px] text-debt">{error}</p>}
          <Button type="submit" className="mt-4 w-full" loading={loading} disabled={!password}>
            {t('login.submit')}
          </Button>
        </motion.form>
      </motion.div>
    </div>
  )
}
