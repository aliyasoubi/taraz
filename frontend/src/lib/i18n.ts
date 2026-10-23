// All user-facing text lives in src/locales/fa.json; source files hold keys only.
import fa from '@/locales/fa.json'

type Dict = typeof fa

/** Dotted paths to string leaves: 'common.save', 'tx.payment', … */
type StringKeys<T, P extends string = ''> = {
  [K in keyof T & string]: T[K] extends string
    ? `${P}${K}`
    : T[K] extends readonly unknown[]
      ? never
      : StringKeys<T[K], `${P}${K}.`>
}[keyof T & string]

export type MessageKey = StringKeys<Dict>

function lookup(key: string): unknown {
  return key.split('.').reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], fa)
}

/** `t('home.lastActivity', { when })` — `{name}` placeholders are filled from `vars`. */
export function t(key: MessageKey, vars?: Record<string, string | number>): string {
  const text = lookup(key)
  if (typeof text !== 'string') return key
  return vars ? text.replace(/\{(\w+)\}/g, (_, name: string) => String(vars[name] ?? '')) : text
}

/** For error codes coming from the API, which are not known at compile time. */
export function tMaybe(key: string): string | null {
  const text = lookup(key)
  return typeof text === 'string' ? text : null
}

export const messages = fa
