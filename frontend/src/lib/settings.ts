import { useSyncExternalStore } from 'react'
import type { Unit } from './format'

export type Theme = 'system' | 'dark' | 'light'

interface Prefs {
  unit: Unit
  theme: Theme
  hideAmounts: boolean
}

const DEFAULTS: Prefs = { unit: 'rial', theme: 'dark', hideAmounts: false }
const KEYS = { unit: 'taraz.unit', theme: 'taraz.theme', hideAmounts: 'taraz.hide' } as const

// Per-device conveniences only. Storage can be unavailable (private mode), so every access is guarded.
function read(): Prefs {
  try {
    const unit = localStorage.getItem(KEYS.unit)
    const theme = localStorage.getItem(KEYS.theme)
    return {
      unit: unit === 'toman' || unit === 'rial' ? unit : DEFAULTS.unit,
      theme: theme === 'system' || theme === 'light' || theme === 'dark' ? theme : DEFAULTS.theme,
      hideAmounts: localStorage.getItem(KEYS.hideAmounts) === '1',
    }
  } catch {
    return DEFAULTS
  }
}

let prefs = read()
const listeners = new Set<() => void>()

export function applyTheme(theme: Theme): void {
  const resolved =
    theme === 'system' ? (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark') : theme
  document.documentElement.dataset.theme = resolved
  document
    .querySelectorAll('meta[name="theme-color"]')
    .forEach((m) => m.setAttribute('content', resolved === 'light' ? '#f5f4fb' : '#07060d'))
}

export function setPref<K extends keyof Prefs>(key: K, value: Prefs[K]): void {
  prefs = { ...prefs, [key]: value }
  try {
    localStorage.setItem(KEYS[key], typeof value === 'boolean' ? (value ? '1' : '0') : String(value))
  } catch {
    /* not persisted; still applies for this session */
  }
  if (key === 'theme') applyTheme(value as Theme)
  listeners.forEach((l) => l())
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function usePrefs(): Prefs {
  return useSyncExternalStore(subscribe, () => prefs)
}

if (typeof window !== 'undefined') {
  applyTheme(prefs.theme)
  matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => {
    if (prefs.theme === 'system') applyTheme('system')
  })
}
