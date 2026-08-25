/** @vitest-environment jsdom */

import {render} from '@solidjs/testing-library'
import {createEffect} from 'solid-js'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import type {ScreenSaverController} from '../model'
import {useScreenSaver} from '../use-screen-saver'

const preferenceMocks = vi.hoisted(() => ({
  read: vi.fn(),
  write: vi.fn(),
}))

vi.mock('../storage', () => ({
  readScreenSaverDelay: preferenceMocks.read,
  writeScreenSaverDelay: preferenceMocks.write,
}))

interface ScreenSaverHarnessProps {
  readonly onController: (controller: ScreenSaverController) => void
  readonly onStateChange: (isActive: boolean) => void
}

const ScreenSaverHarness = (props: ScreenSaverHarnessProps) => {
  const controller = useScreenSaver()
  props.onController(controller)
  createEffect(() => props.onStateChange(controller.isActive()))

  return null
}

describe('useScreenSaver', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    preferenceMocks.read.mockReset().mockResolvedValue('1m')
    preferenceMocks.write.mockReset().mockResolvedValue(undefined)
  })

  afterEach(() => {
    Reflect.deleteProperty(document, 'visibilityState')
    vi.useRealTimers()
  })

  it('should activate after the stored inactivity delay', async () => {
    let controller: ScreenSaverController | undefined
    const onStateChange = vi.fn()

    render(() => (
      <ScreenSaverHarness
        onController={(nextController) => {
          controller = nextController
        }}
        onStateChange={onStateChange}
      />
    ))
    await Promise.resolve()
    expect(controller?.delay()).toBe('1m')

    vi.advanceTimersByTime(59_999)
    expect(controller?.isActive()).toBe(false)

    vi.advanceTimersByTime(1)
    expect(controller?.isActive()).toBe(true)
    expect(onStateChange).toHaveBeenLastCalledWith(true)
  })

  it('should dismiss on activity and restart the full delay', async () => {
    let controller: ScreenSaverController | undefined

    render(() => (
      <ScreenSaverHarness
        onController={(nextController) => {
          controller = nextController
        }}
        onStateChange={() => undefined}
      />
    ))
    await Promise.resolve()
    expect(controller?.delay()).toBe('1m')
    vi.advanceTimersByTime(60_000)
    expect(controller?.isActive()).toBe(true)

    window.dispatchEvent(new Event('pointerdown'))
    expect(controller?.isActive()).toBe(false)

    vi.advanceTimersByTime(59_999)
    expect(controller?.isActive()).toBe(false)
    vi.advanceTimersByTime(1)
    expect(controller?.isActive()).toBe(true)
  })

  it.each(['keydown', 'pointermove', 'scroll', 'wheel'])(
    'should dismiss on %s activity',
    async (eventName) => {
      let controller: ScreenSaverController | undefined

      render(() => (
        <ScreenSaverHarness
          onController={(nextController) => {
            controller = nextController
          }}
          onStateChange={() => undefined}
        />
      ))
      await Promise.resolve()
      vi.advanceTimersByTime(60_000)

      window.dispatchEvent(new Event(eventName))

      expect(controller?.isActive()).toBe(false)
    },
  )

  it('should stay inactive and persist when the preference is turned off', async () => {
    let controller: ScreenSaverController | undefined

    render(() => (
      <ScreenSaverHarness
        onController={(nextController) => {
          controller = nextController
        }}
        onStateChange={() => undefined}
      />
    ))
    await Promise.resolve()
    expect(controller?.delay()).toBe('1m')

    controller?.onDelayChange('off')
    vi.advanceTimersByTime(3_600_000)

    expect(controller?.isActive()).toBe(false)
    expect(preferenceMocks.write).toHaveBeenCalledWith('off')
  })

  it('should ignore a stored preference that arrives after disposal', async () => {
    let completeRead: (delay: string) => void = () => undefined
    preferenceMocks.read.mockReturnValue(
      new Promise((resolve) => {
        completeRead = resolve
      }),
    )
    let controller: ScreenSaverController | undefined
    const result = render(() => (
      <ScreenSaverHarness
        onController={(nextController) => {
          controller = nextController
        }}
        onStateChange={() => undefined}
      />
    ))

    result.unmount()
    completeRead('1m')
    await Promise.resolve()

    expect(controller?.delay()).toBe('off')
  })

  it('should throttle repeated activity while inactive without delaying the next activation', async () => {
    let controller: ScreenSaverController | undefined

    render(() => (
      <ScreenSaverHarness
        onController={(nextController) => {
          controller = nextController
        }}
        onStateChange={() => undefined}
      />
    ))
    await Promise.resolve()

    controller?.onDismiss()
    controller?.onDismiss()
    vi.advanceTimersByTime(60_000)

    expect(controller?.isActive()).toBe(true)
  })

  it('should keep the session preference when storage reads and writes reject', async () => {
    preferenceMocks.read.mockRejectedValue(new Error('read failed'))
    preferenceMocks.write.mockRejectedValue(new Error('write failed'))
    let controller: ScreenSaverController | undefined

    render(() => (
      <ScreenSaverHarness
        onController={(nextController) => {
          controller = nextController
        }}
        onStateChange={() => undefined}
      />
    ))
    await Promise.resolve()

    controller?.onDelayChange('1h')
    await Promise.resolve()

    expect(controller?.delay()).toBe('1h')
    expect(preferenceMocks.write).toHaveBeenCalledWith('1h')
  })

  it('should not overwrite a newer session preference with a delayed stored value', async () => {
    let completeRead: (delay: '1m') => void = () => undefined
    preferenceMocks.read.mockReturnValue(
      new Promise((resolve) => {
        completeRead = resolve
      }),
    )
    let controller: ScreenSaverController | undefined

    render(() => (
      <ScreenSaverHarness
        onController={(nextController) => {
          controller = nextController
        }}
        onStateChange={() => undefined}
      />
    ))
    controller?.onDelayChange('1h')
    completeRead('1m')
    await Promise.resolve()

    expect(controller?.delay()).toBe('1h')
  })

  it('should pause while hidden and restart the delay whenever the document becomes visible', async () => {
    Object.defineProperty(document, 'visibilityState', {configurable: true, value: 'hidden'})
    let controller: ScreenSaverController | undefined

    render(() => (
      <ScreenSaverHarness
        onController={(nextController) => {
          controller = nextController
        }}
        onStateChange={() => undefined}
      />
    ))
    await Promise.resolve()
    vi.advanceTimersByTime(60_000)
    expect(controller?.isActive()).toBe(false)

    Object.defineProperty(document, 'visibilityState', {configurable: true, value: 'visible'})
    document.dispatchEvent(new Event('visibilitychange'))
    vi.advanceTimersByTime(60_000)
    expect(controller?.isActive()).toBe(true)

    Object.defineProperty(document, 'visibilityState', {configurable: true, value: 'hidden'})
    document.dispatchEvent(new Event('visibilitychange'))
    expect(controller?.isActive()).toBe(false)
  })
})
