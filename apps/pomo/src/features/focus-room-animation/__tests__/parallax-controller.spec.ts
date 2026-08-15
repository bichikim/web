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

const startDrag = (host: HTMLElement, startX = 50, startY = 50) => {
  host.dispatchEvent(new MouseEvent('pointerdown', {button: 0, clientX: startX, clientY: startY}))
}

const moveDrag = (host: HTMLElement, clientX: number, clientY: number) => {
  host.dispatchEvent(new MouseEvent('pointermove', {clientX, clientY}))
}

const endDrag = (host: HTMLElement) => {
  host.dispatchEvent(new MouseEvent('pointerup'))
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
})
