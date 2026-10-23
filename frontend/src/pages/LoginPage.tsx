import { useQueryClient } from '@tanstack/react-query'
import { motion } from 'motion/react'
import { Eye, EyeOff, LockKeyhole } from 'lucide-react'
import { useState } from 'react'
import { api, ApiError } from '@/lib/api'
import { keys } from '@/lib/queries'
import { Button, TextInput } from '@/components/ui'

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
      setError(err instanceof ApiError ? err.message : 'ارتباط با سرور برقرار نشد')
      setShake((n) => n + 1)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 pt-safe pb-safe">
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 22 }}
        className="w-full max-w-sm"
      >
        <div className="mb-10 flex flex-col items-center text-center">
          <motion.img
            src="/logo.svg"
            alt=""
            className="size-24 rounded-[28px] shadow-[0_20px_60px_-15px] shadow-brand/70"
            initial={{ rotate: -12, scale: 0.6 }}
            animate={{ rotate: 0, scale: 1 }}
            transition={{ type: 'spring', stiffness: 180, damping: 12, delay: 0.1 }}
          />
          <h1 className="mt-6 text-4xl font-black tracking-tight">
            <span className="text-gradient">تراز</span>
          </h1>
          <p className="mt-2 text-sm text-ink-3">حساب و کتاب بیماران، همیشه همراه شما</p>
        </div>

        <motion.form
          key={shake}
          onSubmit={submit}
          animate={shake ? { x: [0, -12, 10, -6, 4, 0] } : undefined}
          transition={{ duration: 0.45 }}
          className="glass rounded-[28px] border border-line-2 p-5 shadow-float"
        >
          <label className="mb-2 flex items-center gap-2 text-[13px] font-medium text-ink-2">
            <LockKeyhole className="size-4" /> رمز عبور
          </label>
          <div className="relative">
            <TextInput
              type={show ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              autoFocus
              dir="ltr"
              className="pe-12"
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="absolute end-3 top-1/2 -translate-y-1/2 text-ink-3"
              aria-label={show ? 'پنهان کردن رمز' : 'نمایش رمز'}
            >
              {show ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
            </button>
          </div>
          {error && <p className="mt-3 text-sm text-debt">{error}</p>}
          <Button type="submit" className="mt-5 w-full" loading={loading} disabled={!password}>
            ورود
          </Button>
        </motion.form>
      </motion.div>
    </div>
  )
}
