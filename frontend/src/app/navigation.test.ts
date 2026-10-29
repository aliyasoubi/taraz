import { describe, expect, it } from 'vitest'
import { directionOf, nextStack, swipeCompletes } from './navigation'

describe('directionOf', () => {
  it('switches tabs without animation', () => {
    expect(directionOf('/', '/receipts', 'PUSH')).toBe('none')
    expect(directionOf('/patients/3', '/month', 'PUSH')).toBe('none')
  })
  it('pushes deeper screens and pops back', () => {
    expect(directionOf('/', '/patients/3', 'PUSH')).toBe('push')
    expect(directionOf('/patients/3', '/', 'POP')).toBe('pop')
    expect(directionOf('/settings', '/accounts', 'PUSH')).toBe('push')
  })
})

describe('nextStack', () => {
  it('grows on push and trims on pop', () => {
    const a = nextStack(['/'], '/settings', 'PUSH')
    const b = nextStack(a, '/accounts', 'PUSH')
    expect(b).toEqual(['/', '/settings', '/accounts'])
    expect(nextStack(b, '/settings', 'POP')).toEqual(['/', '/settings'])
  })
  it('starts over at a tab root', () => {
    expect(nextStack(['/', '/patients/3'], '/receipts', 'PUSH')).toEqual(['/receipts'])
  })
  it('replaces the top screen', () => {
    expect(nextStack(['/', '/patients/3'], '/', 'REPLACE')).toEqual(['/'])
    expect(nextStack(['/', '/settings', '/accounts'], '/accounts/2', 'REPLACE')).toEqual([
      '/',
      '/settings',
      '/accounts/2',
    ])
  })
  it('forgets history it never saw', () => {
    expect(nextStack(['/patients/3'], '/settings', 'POP')).toEqual(['/settings'])
  })
})

describe('swipeCompletes', () => {
  it('needs a third of the width, or a flick', () => {
    expect(swipeCompletes(-100, 0, 375)).toBe(false)
    expect(swipeCompletes(-140, 0, 375)).toBe(true)
    expect(swipeCompletes(-40, -900, 375)).toBe(true)
  })
})
