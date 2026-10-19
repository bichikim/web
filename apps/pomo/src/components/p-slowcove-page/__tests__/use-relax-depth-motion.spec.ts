/** @vitest-environment jsdom */

import {cleanup, fireEvent, renderHook} from '@solidjs/testing-library'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import {useRelaxDepthMotion} from '../use-relax-depth-motion'

const createPreference = (initiallyReduced: boolean) => {
  const listeners = new Set<(event: {readonly matches: boolean}) => void>()
  const preference = {
    addEventListener: (_type: string, listener: (event: {readonly matches: boolean}) => void) =>
      listeners.add(listener),
    matches: initiallyReduced,
    removeEventListener: (_type: string, listener: (event: {readonly matches: boolean}) => void) =>
      listeners.delete(listener),
  }

  return {
    preference,
    setMatches: (matches: boolean, dispatchChange = true) => {
      preference.matches = matches
      if (dispatchChange) {
        for (const listener of listeners) {
          listener({matches})
        }
      }
    },
  }
}

const sendOrientation = (beta: number, gamma: number) => {
  fireEvent(globalThis.window, Object.assign(new Event('deviceorientation'), {beta, gamma}))
}

beforeEach(() => {
  vi.stubGlobal('isSecureContext', true)
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

it('should report reduced motion without requesting gyroscope permission', () => {
  const {preference} = createPreference(true)
  const requestPermission = vi.fn(() => Promise.resolve('granted' as const))
  vi.stubGlobal('matchMedia', () => preference)
  vi.stubGlobal(
    'DeviceOrientationEvent',
    class {
      static requestPermission = requestPermission
    },
  )

  const {result} = renderHook(() => useRelaxDepthMotion())

  expect(result.inputMode()).toBe('drag')
  expect(result.status()).toBe('reduced-motion')

  result.setInputMode('gyroscope')

  expect(result.inputMode()).toBe('drag')
  expect(result.status()).toBe('reduced-motion')
  expect(requestPermission).not.toHaveBeenCalled()
})

it('should reset gyroscope state on reduced motion and require selection again when re-enabled', async () => {
  const {preference, setMatches} = createPreference(false)
  const matchMedia = vi.fn(() => preference)
  vi.stubGlobal('matchMedia', matchMedia)
  vi.stubGlobal('DeviceOrientationEvent', class {})
  vi.stubGlobal('requestAnimationFrame', undefined)

  const {result} = renderHook(() => useRelaxDepthMotion())

  result.setInputMode('gyroscope')
  await Promise.resolve()
  expect(result.inputMode()).toBe('gyroscope')
  expect(result.status()).toBe('waiting')

  sendOrientation(0, 0)
  expect(result.status()).toBe('active')
  sendOrientation(0, 30)
  expect(result.offset().x).toBeGreaterThan(0)

  setMatches(true)
  expect(result.inputMode()).toBe('drag')
  expect(result.status()).toBe('reduced-motion')
  expect(result.offset()).toEqual({x: 0, y: 0})

  sendOrientation(0, 15)
  expect(result.status()).toBe('reduced-motion')
  expect(result.offset()).toEqual({x: 0, y: 0})

  setMatches(false)
  expect(result.inputMode()).toBe('drag')
  expect(result.status()).toBe('ready')
  expect(result.offset()).toEqual({x: 0, y: 0})

  sendOrientation(0, 15)
  expect(result.status()).toBe('ready')

  result.setInputMode('gyroscope')
  await Promise.resolve()
  expect(result.inputMode()).toBe('gyroscope')
  expect(result.status()).toBe('waiting')
  sendOrientation(0, 0)
  expect(result.status()).toBe('active')
  expect(matchMedia).toHaveBeenCalledOnce()
})

it.each([
  ['preference change event', true],
  ['preference matches before its change event', false],
])(
  'should ignore granted permission when reduced motion becomes active during the request (%s)',
  async (_race, dispatchChange) => {
    const {preference, setMatches} = createPreference(false)
    let resolvePermission = (_permission: 'granted') => {}
    const permission = new Promise<'granted'>((resolve) => {
      resolvePermission = resolve
    })
    const requestPermission = vi.fn(() => permission)
    vi.stubGlobal('matchMedia', () => preference)
    vi.stubGlobal(
      'DeviceOrientationEvent',
      class {
        static requestPermission = requestPermission
      },
    )

    const {result} = renderHook(() => useRelaxDepthMotion())

    result.setInputMode('gyroscope')
    expect(result.inputMode()).toBe('drag')
    expect(result.status()).toBe('requesting')

    setMatches(true, dispatchChange)
    if (dispatchChange) {
      expect(result.status()).toBe('reduced-motion')
    }
    resolvePermission('granted')
    await permission
    await Promise.resolve()

    expect(result.inputMode()).toBe('drag')
    expect(result.status()).toBe('reduced-motion')
    expect(result.offset()).toEqual({x: 0, y: 0})
  },
)

it('should preserve reduced motion status when a pending permission request is rejected', async () => {
  const {preference, setMatches} = createPreference(false)
  let rejectPermission = (_reason: Error) => {}
  const permission = new Promise<'granted'>((_resolve, reject) => {
    rejectPermission = reject
  })
  vi.stubGlobal('matchMedia', () => preference)
  vi.stubGlobal(
    'DeviceOrientationEvent',
    class {
      static requestPermission = () => permission
    },
  )

  const {result} = renderHook(() => useRelaxDepthMotion())
  result.setInputMode('gyroscope')
  expect(result.status()).toBe('requesting')

  setMatches(true)
  rejectPermission(new Error('permission request failed'))
  await permission.catch(() => undefined)
  await Promise.resolve()

  expect(result.inputMode()).toBe('drag')
  expect(result.status()).toBe('reduced-motion')
})

it('should ignore a late permission grant after switching back to drag', async () => {
  const {preference} = createPreference(false)
  let resolvePermission = (_permission: 'granted') => {}
  const permission = new Promise<'granted'>((resolve) => {
    resolvePermission = resolve
  })
  vi.stubGlobal('matchMedia', () => preference)
  vi.stubGlobal(
    'DeviceOrientationEvent',
    class {
      static requestPermission = () => permission
    },
  )

  const {result} = renderHook(() => useRelaxDepthMotion())
  result.setInputMode('gyroscope')
  expect(result.status()).toBe('requesting')

  result.setInputMode('drag')
  expect(result.inputMode()).toBe('drag')
  expect(result.status()).toBe('ready')
  resolvePermission('granted')
  await permission
  await Promise.resolve()

  expect(result.inputMode()).toBe('drag')
  expect(result.status()).toBe('ready')
})

it('should ignore a permission result after disposal', async () => {
  const {preference} = createPreference(false)
  let resolvePermission = (_permission: 'granted') => {}
  const permission = new Promise<'granted'>((resolve) => {
    resolvePermission = resolve
  })
  vi.stubGlobal('matchMedia', () => preference)
  vi.stubGlobal(
    'DeviceOrientationEvent',
    class {
      static requestPermission = () => permission
    },
  )

  const {cleanup: dispose, result} = renderHook(() => useRelaxDepthMotion())
  result.setInputMode('gyroscope')
  expect(result.status()).toBe('requesting')

  dispose()
  resolvePermission('granted')
  await permission
  await Promise.resolve()

  expect(result.inputMode()).toBe('drag')
  expect(result.status()).toBe('requesting')
  expect(result.offset()).toEqual({x: 0, y: 0})
})

it('should remove the gyroscope listener and reset the offset on disposal', async () => {
  const {preference} = createPreference(false)
  vi.stubGlobal('matchMedia', () => preference)
  vi.stubGlobal('DeviceOrientationEvent', class {})
  vi.stubGlobal('requestAnimationFrame', undefined)
  const addEventListener = vi.spyOn(globalThis, 'addEventListener')
  const removeEventListener = vi.spyOn(globalThis, 'removeEventListener')

  const {cleanup: dispose, result} = renderHook(() => useRelaxDepthMotion())
  result.setInputMode('gyroscope')
  await Promise.resolve()
  sendOrientation(0, 0)
  sendOrientation(0, 30)
  expect(result.status()).toBe('active')
  expect(result.offset().x).toBeGreaterThan(0)

  const orientationListener = addEventListener.mock.calls.find(
    ([eventType]) => eventType === 'deviceorientation',
  )?.[1]
  expect(orientationListener).toBeTypeOf('function')

  dispose()

  expect(removeEventListener).toHaveBeenCalledWith('deviceorientation', orientationListener)
  expect(result.offset()).toEqual({x: 0, y: 0})
})
