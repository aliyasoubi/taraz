// The destination account used last, so the next payment defaults to it. Per device, best effort.
const KEY = 'taraz.lastAccount'

export function readLastAccount(): number | null {
  try {
    const id = Number(localStorage.getItem(KEY))
    return Number.isFinite(id) && id > 0 ? id : null
  } catch {
    return null
  }
}

export function rememberLastAccount(id: number): void {
  try {
    localStorage.setItem(KEY, String(id))
  } catch {
    /* storage unavailable (private mode): only a convenience is lost */
  }
}
