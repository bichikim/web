/** @vitest-environment jsdom */
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {ParallaxController} from '../parallax-controller'

class MotionPreference extends EventTarget {
  matches = false
  readonly media = '(prefers-reduced-motion: reduce)'

  setMatches(matches: boolean) {
    this.matches = matches
    this.dispatchEvent(new Event('change'))
  }
}

class TestDeviceOrientationEvent extends Event {
  readonly beta: number | null
  readonly gamma: number | null

  constructor(type: string, init: DeviceOrientationEventInit = {}) {
    super(type)
    this.beta = init.beta ?? null
    this.gamma = init.gamma ?? null
  }
}

const createAnimationFrames = () => {
  const animationFrames: FrameRequestCallback[] = []

  vi.stubGlobal(
    'requestAnimationFrame',
    vi.fn((callback: FrameRequestCallback) => {
      animationFrames.push(callback)
      return animationFrames.length
    }),
  )
  vi.stubGlobal('cancelAnimationFrame', vi.fn())

  return animationFrames
}

const createPointerHost = () => {
  const host = document.createElement('div')

  vi.spyOn(host, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 100, 100))

  return host
}

const createPointerEvent = (
  type: string,
  {pointerId = 1, ...init}: MouseEventInit & {readonly pointerId?: number} = {},
) => {
  const event = new MouseEvent(type, init)
  Object.defineProperty(event, 'pointerId', {value: pointerId})
  return event
}

const startDrag = (host: HTMLElement, startX = 50, startY = 50) => {
  host.dispatchEvent(
    createPointerEvent('pointerdown', {button: 0, clientX: startX, clientY: startY}),
  )
}

const moveDrag = (host: HTMLElement, clientX: number, clientY: number) => {
  host.dispatchEvent(createPointerEvent('pointermove', {clientX, clientY}))
}

const endDrag = (host: HTMLElement) => {
  host.dispatchEvent(createPointerEvent('pointerup'))
}

const runDragAnimation = (frameDuration: number) => {
  const animationFrames = createAnimationFrames()
  const renderOffset = vi.fn()
  const host = createPointerHost()
  const controller = new ParallaxController(host, renderOffset)
  const frameCount = Math.round(400 / frameDuration)

  controller.start()
  startDrag(host)
  moveDrag(host, 15, 50)

  for (let frameIndex = 1; frameIndex <= frameCount; frameIndex += 1) {
    animationFrames.shift()?.(frameIndex * frameDuration)
  }

  const horizontalOffset = renderOffset.mock.lastCall?.[0]
  controller.destroy()

  return horizontalOffset
}

describe('ParallaxController', () => {
  const motionPreference = new MotionPreference()

  beforeEach(() => {
    motionPreference.matches = false
    vi.spyOn(performance, 'now').mockReturnValue(0)
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => motionPreference),
    )
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('should propagate runtime reduced-motion preference changes', () => {
    const renderOffset = vi.fn()
    const onMotionPreferenceChange = vi.fn()
    const controller = new ParallaxController(document.createElement('div'), renderOffset, {
      onMotionPreferenceChange,
    })

    controller.start()
    motionPreference.setMatches(true)
    motionPreference.setMatches(false)

    expect(renderOffset).toHaveBeenNthCalledWith(1, 0, 0)
    expect(renderOffset).toHaveBeenNthCalledWith(2, 0, 0)
    expect(onMotionPreferenceChange).toHaveBeenNthCalledWith(1, true)
    expect(onMotionPreferenceChange).toHaveBeenNthCalledWith(2, false)

    controller.destroy()
    motionPreference.setMatches(true)

    expect(onMotionPreferenceChange).toHaveBeenCalledTimes(2)
  })

  it('should render device orientation offsets on coarse non-hover input', () => {
    const animationFrames = createAnimationFrames()
    const renderOffset = vi.fn()

    vi.stubGlobal('DeviceOrientationEvent', TestDeviceOrientationEvent)

    const controller = new ParallaxController(document.createElement('div'), renderOffset, {
      inputMode: 'gyroscope',
    })

    controller.start()
    window.dispatchEvent(new TestDeviceOrientationEvent('deviceorientation', {beta: 0, gamma: 0}))
    window.dispatchEvent(new TestDeviceOrientationEvent('deviceorientation', {beta: 7, gamma: 9}))
    animationFrames.shift()?.(1_000 / 60)

    expect(renderOffset.mock.lastCall?.[0]).toBeCloseTo(0.0442, 4)
    expect(renderOffset.mock.lastCall?.[1]).toBeCloseTo(0.0442, 4)

    controller.destroy()
  })

  it('should keep drag tracking speed consistent across refresh rates', () => {
    const sixtyHertzOffset = runDragAnimation(1_000 / 60)
    const oneTwentyHertzOffset = runDragAnimation(1_000 / 120)

    expect(sixtyHertzOffset).toBeCloseTo(oneTwentyHertzOffset ?? 0, 2)
  })

  it('should ignore pointer movement until the background is pressed', () => {
    const animationFrames = createAnimationFrames()
    const host = createPointerHost()
    const controller = new ParallaxController(host, vi.fn())

    controller.start()
    moveDrag(host, 15, 50)

    expect(animationFrames).toHaveLength(0)

    controller.destroy()
  })

  it('should delay returning to center after the drag ends', () => {
    vi.useFakeTimers()
    const animationFrames = createAnimationFrames()
    const host = createPointerHost()
    const controller = new ParallaxController(host, vi.fn())

    controller.start()
    startDrag(host)
    endDrag(host)
    vi.advanceTimersByTime(149)

    expect(animationFrames).toHaveLength(0)

    vi.advanceTimersByTime(1)

    expect(animationFrames).toHaveLength(1)

    controller.destroy()
  })

  it('should cancel the delayed return when a new drag starts', () => {
    vi.useFakeTimers()
    const animationFrames = createAnimationFrames()
    const host = createPointerHost()
    const controller = new ParallaxController(host, vi.fn())

    controller.start()
    startDrag(host)
    endDrag(host)
    vi.advanceTimersByTime(100)
    startDrag(host)

    expect(vi.getTimerCount()).toBe(0)
    expect(animationFrames).toHaveLength(0)

    controller.destroy()
  })

  it('should switch from drag input to device orientation input', () => {
    const animationFrames = createAnimationFrames()
    const renderOffset = vi.fn()
    const host = createPointerHost()

    vi.stubGlobal('DeviceOrientationEvent', TestDeviceOrientationEvent)

    const controller = new ParallaxController(host, renderOffset)

    controller.start()
    controller.setInputMode('gyroscope')
    startDrag(host)
    moveDrag(host, 15, 50)

    expect(animationFrames).toHaveLength(1)

    animationFrames.shift()?.(16)
    window.dispatchEvent(new TestDeviceOrientationEvent('deviceorientation', {beta: 0, gamma: 0}))
    window.dispatchEvent(new TestDeviceOrientationEvent('deviceorientation', {beta: 7, gamma: 9}))
    animationFrames.shift()?.(32)

    expect(renderOffset.mock.lastCall?.[0]).toBeGreaterThan(0)

    controller.destroy()
  })

  it('should fall back to drag when gyroscope coordinates do not arrive', () => {
    vi.useFakeTimers()
    createAnimationFrames()
    const onInputModeChange = vi.fn()

    vi.stubGlobal('DeviceOrientationEvent', TestDeviceOrientationEvent)

    const controller = new ParallaxController(document.createElement('div'), vi.fn(), {
      inputMode: 'gyroscope',
      onInputModeChange,
    })

    controller.start()
    vi.advanceTimersByTime(1_500)

    expect(onInputModeChange).toHaveBeenCalledExactlyOnceWith('drag')

    controller.destroy()
  })

  it('should keep start, input mode, and destroy operations idempotent', () => {
    const host = createPointerHost()
    const controller = new ParallaxController(host, vi.fn())

    expect(controller.prefersReducedMotion).toBe(false)
    controller.setInputMode('drag')
    controller.setInputMode('gyroscope')
    controller.setInputMode('drag')
    controller.start()
    controller.start()
    controller.destroy()
    controller.destroy()
    controller.start()
  })

  it('should ignore invalid drag events and zero-sized hosts', () => {
    const animationFrames = createAnimationFrames()
    const host = createPointerHost()
    const controller = new ParallaxController(host, vi.fn())
    controller.start()

    host.dispatchEvent(createPointerEvent('pointerdown', {button: 1}))
    motionPreference.setMatches(true)
    startDrag(host)
    motionPreference.setMatches(false)
    startDrag(host)
    host.dispatchEvent(createPointerEvent('pointermove', {clientX: 0, pointerId: 2}))
    vi.spyOn(host, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 0, 100))
    moveDrag(host, 0, 0)
    host.dispatchEvent(createPointerEvent('pointerup', {pointerId: 2}))

    expect(animationFrames).toHaveLength(0)
    controller.destroy()
  })

  it('should clamp drag distance and release captures on blur', () => {
    const animationFrames = createAnimationFrames()
    const host = createPointerHost()
    const setPointerCapture = vi.fn()
    const releasePointerCapture = vi.fn()
    Object.assign(host, {
      hasPointerCapture: vi.fn(() => true),
      releasePointerCapture,
      setPointerCapture,
    })
    const renderOffset = vi.fn()
    const controller = new ParallaxController(host, renderOffset)
    controller.start()
    startDrag(host)
    moveDrag(host, -500, 500)
    animationFrames.shift()?.(64)
    window.dispatchEvent(new Event('blur'))

    expect(setPointerCapture).toHaveBeenCalledWith(1)
    expect(releasePointerCapture).toHaveBeenCalledWith(1)
    expect(renderOffset).toHaveBeenCalled()
    controller.destroy()
  })

  it('should reset active input when the document becomes hidden', () => {
    createAnimationFrames()
    const host = createPointerHost()
    const controller = new ParallaxController(host, vi.fn())
    controller.start()
    startDrag(host)
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(true)

    document.dispatchEvent(new Event('visibilitychange'))

    controller.destroy()
  })

  it('should fall back immediately when device orientation is unavailable', () => {
    const onInputModeChange = vi.fn()
    Reflect.deleteProperty(window, 'DeviceOrientationEvent')
    const controller = new ParallaxController(document.createElement('div'), vi.fn(), {
      inputMode: 'gyroscope',
      onInputModeChange,
    })

    controller.start()

    expect(onInputModeChange).toHaveBeenCalledWith('drag')
    controller.destroy()
  })

  it('should exercise default fallback callbacks without custom options', () => {
    Reflect.deleteProperty(window, 'DeviceOrientationEvent')
    const controller = new ParallaxController(document.createElement('div'), vi.fn(), {
      inputMode: 'gyroscope',
    })

    controller.start()
    controller.destroy()
  })

  it.each(['denied', 'prompt'] as const)(
    'should fall back when orientation permission is %s',
    async (permission) => {
      const onInputModeChange = vi.fn()
      Object.assign(TestDeviceOrientationEvent, {requestPermission: vi.fn(async () => permission)})
      vi.stubGlobal('DeviceOrientationEvent', TestDeviceOrientationEvent)
      const controller = new ParallaxController(document.createElement('div'), vi.fn(), {
        inputMode: 'gyroscope',
        onInputModeChange,
      })
      controller.start()

      window.dispatchEvent(createPointerEvent('pointerdown'))
      await vi.waitFor(() => expect(onInputModeChange).toHaveBeenCalledWith('drag'))
      controller.destroy()
      Reflect.deleteProperty(TestDeviceOrientationEvent, 'requestPermission')
    },
  )

  it('should begin orientation tracking after permission is granted', async () => {
    Object.assign(TestDeviceOrientationEvent, {requestPermission: vi.fn(async () => 'granted')})
    vi.stubGlobal('DeviceOrientationEvent', TestDeviceOrientationEvent)
    const controller = new ParallaxController(document.createElement('div'), vi.fn(), {
      inputMode: 'gyroscope',
    })
    controller.start()

    window.dispatchEvent(createPointerEvent('pointerup'))
    await vi.waitFor(() =>
      expect(
        (TestDeviceOrientationEvent as unknown as {requestPermission: ReturnType<typeof vi.fn>})
          .requestPermission,
      ).toHaveBeenCalledOnce(),
    )
    controller.destroy()
    Reflect.deleteProperty(TestDeviceOrientationEvent, 'requestPermission')
  })

  it('should fall back when the permission request rejects', async () => {
    const onInputModeChange = vi.fn()
    Object.assign(TestDeviceOrientationEvent, {
      requestPermission: vi.fn(async () => Promise.reject(new Error('unavailable'))),
    })
    vi.stubGlobal('DeviceOrientationEvent', TestDeviceOrientationEvent)
    const controller = new ParallaxController(document.createElement('div'), vi.fn(), {
      inputMode: 'gyroscope',
      onInputModeChange,
    })
    controller.start()

    window.dispatchEvent(createPointerEvent('pointerdown'))
    await vi.waitFor(() => expect(onInputModeChange).toHaveBeenCalledWith('drag'))
    controller.destroy()
    Reflect.deleteProperty(TestDeviceOrientationEvent, 'requestPermission')
  })

  it('should ignore orientation input while unavailable and reset on orientation changes', () => {
    createAnimationFrames()
    vi.stubGlobal('DeviceOrientationEvent', TestDeviceOrientationEvent)
    const controller = new ParallaxController(document.createElement('div'), vi.fn(), {
      inputMode: 'gyroscope',
    })
    controller.start()

    motionPreference.setMatches(true)
    window.dispatchEvent(new TestDeviceOrientationEvent('deviceorientation', {beta: 1, gamma: 1}))
    motionPreference.setMatches(false)
    vi.spyOn(document, 'hidden', 'get').mockReturnValueOnce(true).mockReturnValue(false)
    window.dispatchEvent(new TestDeviceOrientationEvent('deviceorientation', {beta: 1, gamma: 1}))
    window.dispatchEvent(new TestDeviceOrientationEvent('deviceorientation'))
    window.dispatchEvent(new Event('orientationchange'))
    document.dispatchEvent(new Event('visibilitychange'))
    window.dispatchEvent(new Event('blur'))

    controller.setInputMode('drag')
    window.dispatchEvent(new TestDeviceOrientationEvent('deviceorientation', {beta: 1, gamma: 1}))
    controller.destroy()
  })

  it('should ignore late permission results after mode changes or destruction', async () => {
    let resolvePermission: (permission: 'granted') => void = () => undefined
    Object.assign(TestDeviceOrientationEvent, {
      requestPermission: vi.fn(
        () =>
          new Promise<'granted'>((resolve) => {
            resolvePermission = resolve
          }),
      ),
    })
    vi.stubGlobal('DeviceOrientationEvent', TestDeviceOrientationEvent)
    const first = new ParallaxController(document.createElement('div'), vi.fn(), {
      inputMode: 'gyroscope',
    })
    first.start()
    window.dispatchEvent(createPointerEvent('pointerdown'))
    first.setInputMode('drag')
    resolvePermission('granted')
    await Promise.resolve()
    first.destroy()

    let resolveDestroyed: (permission: 'granted') => void = () => undefined
    Object.assign(TestDeviceOrientationEvent, {
      requestPermission: vi.fn(
        () =>
          new Promise<'granted'>((resolve) => {
            resolveDestroyed = resolve
          }),
      ),
    })
    const second = new ParallaxController(document.createElement('div'), vi.fn(), {
      inputMode: 'gyroscope',
    })
    second.start()
    window.dispatchEvent(createPointerEvent('pointerdown'))
    second.destroy()
    resolveDestroyed('granted')
    await Promise.resolve()

    Object.assign(TestDeviceOrientationEvent, {
      requestPermission: vi.fn(async () => Promise.reject(new Error('late failure'))),
    })
    const third = new ParallaxController(document.createElement('div'), vi.fn(), {
      inputMode: 'gyroscope',
    })
    third.start()
    window.dispatchEvent(createPointerEvent('pointerdown'))
    third.destroy()
    await vi.waitFor(() =>
      expect(
        (TestDeviceOrientationEvent as unknown as {requestPermission: ReturnType<typeof vi.fn>})
          .requestPermission,
      ).toHaveBeenCalled(),
    )
    Reflect.deleteProperty(TestDeviceOrientationEvent, 'requestPermission')
  })

  it('should keep duplicate activation and return scheduling idempotent', async () => {
    vi.useFakeTimers()
    Object.assign(TestDeviceOrientationEvent, {
      requestPermission: vi.fn(async () => Promise.reject(new Error('denied'))),
    })
    vi.stubGlobal('DeviceOrientationEvent', TestDeviceOrientationEvent)
    const host = createPointerHost()
    const controller = new ParallaxController(host, vi.fn(), {inputMode: 'gyroscope'})
    controller.start()
    window.dispatchEvent(createPointerEvent('pointerdown'))
    window.dispatchEvent(createPointerEvent('pointerup'))
    await vi.runAllTimersAsync()

    startDrag(host)
    endDrag(host)
    host.dispatchEvent(createPointerEvent('pointercancel', {pointerId: null as unknown as number}))
    host.dispatchEvent(createPointerEvent('pointercancel', {pointerId: null as unknown as number}))
    controller.destroy()
    Reflect.deleteProperty(TestDeviceOrientationEvent, 'requestPermission')
  })

  it('should cancel a pending frame for immediate motion reduction', () => {
    const animationFrames = createAnimationFrames()
    const host = createPointerHost()
    const controller = new ParallaxController(host, vi.fn())
    controller.start()
    startDrag(host)
    moveDrag(host, 0, 0)

    motionPreference.setMatches(true)
    animationFrames.shift()?.(16)

    expect(cancelAnimationFrame).toHaveBeenCalled()
    controller.destroy()
  })
})
