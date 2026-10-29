/** @vitest-environment jsdom */
import {renderHook, waitFor} from '@solidjs/testing-library'
import {afterEach, beforeEach, expect, test, vi} from 'vitest'
import {Observer} from 'gsap/Observer'
import {useDesktopStory} from '../use-desktop-story'

vi.mock('gsap', () => ({gsap: {registerPlugin: vi.fn()}}))
vi.mock('gsap/Observer', () => ({Observer: {create: vi.fn()}}))

let settings: Observer.ObserverVars
const gesture = {kill: vi.fn()}
const self = gesture as unknown as Observer
let mediaListener: (() => void) | null = null
let resizeListener: ResizeObserverCallback
let update: FrameRequestCallback | null = null
let width = 390
let height = 720
const disconnect = vi.fn()
const preference = {addEventListener: vi.fn(), matches: false, removeEventListener: vi.fn()}

beforeEach(() => {
  width = 390
  height = 720
  update = null
  preference.matches = false
  preference.addEventListener.mockImplementation((_event: string, callback: () => void) => {
    mediaListener = callback
  })
  vi.mocked(Observer.create).mockImplementation((vars) => {
    settings = vars
    return self
  })
  vi.stubGlobal('matchMedia', () => preference)
  vi.stubGlobal(
    'requestAnimationFrame',
    vi.fn((callback: FrameRequestCallback) => {
      update = callback
      return 7
    }),
  )
  vi.stubGlobal('cancelAnimationFrame', vi.fn())
  vi.stubGlobal(
    'ResizeObserver',
    vi.fn().mockImplementation(function observer(callback) {
      resizeListener = callback
      return {disconnect, observe: vi.fn()}
    }),
  )
})

afterEach(() => {
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})

const setup = async () => {
  const stage = document.createElement('div')
  Object.defineProperties(stage, {
    clientHeight: {get: () => height},
    clientWidth: {get: () => width},
  })
  const hook = renderHook(() => useDesktopStory({stage: () => stage}))
  await waitFor(() => expect(Observer.create).toHaveBeenCalledOnce())
  return hook
}

const finish = (story: ReturnType<typeof useDesktopStory>) => {
  const revision = story.transition()!.revision
  story.covered(revision)
  story.finished(revision)
}
const forward = () => settings.onUp?.(self)
const backward = () => settings.onDown?.(self)

const press = (key: string, repeat = false) => {
  const event = new KeyboardEvent('keydown', {cancelable: true, key, repeat})
  globalThis.dispatchEvent(event)
  return event
}

test('should receive gestures across the viewport rather than only inside the presentation stage', async () => {
  const hook = await setup()
  expect(settings.target).toBe(document)
  const outside = document.createElement('div')
  document.body.append(outside)
  const wheel = new WheelEvent('wheel', {bubbles: true, deltaY: 120})
  outside.dispatchEvent(wheel)
  expect(settings.ignoreCheck?.(wheel, false)).toBe(false)
  outside.remove()
  hook.cleanup()
})

test('should discard input during both phases and accept the next input after completion', async () => {
  const hook = await setup()
  forward()
  forward()
  backward()
  press('End')
  expect(hook.result.transition()).toMatchObject({phase: 'cover', revision: 1, to: 0})
  hook.result.covered(1)
  forward()
  backward()
  press('Home')
  expect(hook.result.transition()).toMatchObject({phase: 'reveal', revision: 1, to: 0})
  hook.result.finished(1)
  expect(hook.result.transition()).toBeNull()
  expect(hook.result.frame().chapter).toBe(0)
  forward()
  expect(hook.result.transition()).toMatchObject({revision: 2, to: 1})
  hook.cleanup()
})

test('should retain both masked scenes and restore control only after the reverse exit', async () => {
  const hook = await setup()
  hook.result.startIntroduction()
  expect(hook.result.scenes().outgoing?.visible).toBe(false)
  expect(hook.result.scenes().incoming).toMatchObject({chapter: 0, visible: true})
  expect(hook.result.frame().visible).toBe(false)
  hook.result.covered(1)
  expect(hook.result.frame().visible).toBe(true)
  expect(hook.result.scenes().outgoing?.visible).toBe(false)
  hook.result.finished(1)
  expect(hook.result.scenes().outgoing).toBeNull()
  backward()
  expect(hook.result.scenes().outgoing).toMatchObject({chapter: 0, visible: true})
  hook.result.covered(2)
  expect(hook.result.frame().visible).toBe(false)
  expect(hook.result.frame().active).toBe(true)
  expect(hook.result.scenes().outgoing?.visible).toBe(true)
  hook.result.finished(2)
  expect(hook.result.frame().active).toBe(false)
  hook.cleanup()
})

test('should ignore held keyboard repeats and preserve typing and open popovers', async () => {
  const hook = await setup()
  expect(press('PageDown').defaultPrevented).toBe(true)
  finish(hook.result)
  press('PageDown', true)
  expect(hook.result.transition()).toBeNull()
  press('PageDown')
  expect(hook.result.transition()).toMatchObject({to: 1})
  const input = document.createElement('textarea')
  document.body.append(input)
  const typing = new KeyboardEvent('keydown', {bubbles: true, cancelable: true, key: ' '})
  input.dispatchEvent(typing)
  expect(typing.defaultPrevented).toBe(false)
  expect(settings.ignoreCheck?.(new WheelEvent('wheel', {ctrlKey: true}), false)).toBe(true)
  expect(settings.ignoreCheck?.(new WheelEvent('wheel', {deltaX: 100, deltaY: 10}), false)).toBe(
    true,
  )
  const wheel = new WheelEvent('wheel', {bubbles: true})
  input.dispatchEvent(wheel)
  expect(settings.ignoreCheck?.(wheel, false)).toBe(true)
  input.remove()
  const popover = document.createElement('div')
  popover.setAttribute('popover', '')
  const scroll = new WheelEvent('wheel')
  popover.dispatchEvent(scroll)
  expect(settings.ignoreCheck?.(scroll, false)).toBe(true)
  const widget = document.createElement('button')
  widget.setAttribute('data-character-drag', '')
  const drag = new Event('pointerdown')
  widget.dispatchEvent(drag)
  expect(settings.ignoreCheck?.(drag, true)).toBe(true)
  const wheelOnWidget = new WheelEvent('wheel')
  widget.dispatchEvent(wheelOnWidget)
  expect(settings.ignoreCheck?.(wheelOnWidget, false)).toBe(false)
  hook.cleanup()
})

test('should retain reduced-motion navigation and resize without selecting a different chapter', async () => {
  const hook = await setup()
  forward()
  preference.matches = true
  mediaListener!()
  update!(0)
  expect(hook.result.transition()).toBeNull()
  expect(hook.result.frame().character.playing).toBe(false)
  width = 300
  height = 650
  resizeListener([], {} as ResizeObserver)
  update!(0)
  expect(hook.result.frame().chapter).toBe(0)
  expect(hook.result.frame().character.x).toBeCloseTo(84)
  forward()
  expect(hook.result.frame().chapter).toBe(1)
  expect(hook.result.transition()).toBeNull()
  hook.cleanup()
})

test('should clamp the first and last scene and clean up all input ownership', async () => {
  const hook = await setup()
  backward()
  expect(hook.result.transition()).toBeNull()
  press('End')
  expect(hook.result.transition()).toMatchObject({to: 5})
  finish(hook.result)
  forward()
  expect(hook.result.transition()).toBeNull()
  hook.result.returnToPlayground()
  finish(hook.result)
  expect(hook.result.frame().active).toBe(false)
  hook.cleanup()
  expect(gesture.kill).toHaveBeenCalledOnce()
  expect(disconnect).toHaveBeenCalledOnce()
  expect(press('PageDown').defaultPrevented).toBe(false)
})

test('should accept the opposite direction immediately after scrolling past either end', async () => {
  const hook = await setup()
  backward()
  forward()
  expect(hook.result.transition()).toMatchObject({to: 0})
  finish(hook.result)
  press('End')
  finish(hook.result)
  forward()
  forward()
  backward()
  expect(hook.result.transition()).toMatchObject({to: 4})
  hook.cleanup()
})

test('should accept a direction change after completion without waiting for an input stop', async () => {
  const hook = await setup()
  press('End')
  finish(hook.result)
  backward()
  forward()
  expect(hook.result.transition()).toMatchObject({to: 4})
  finish(hook.result)
  forward()
  expect(hook.result.transition()).toMatchObject({to: 5})
  finish(hook.result)
  forward()
  backward()
  expect(hook.result.transition()).toMatchObject({to: 4})
  hook.cleanup()
})

test('should not create an Observer if the story unmounts before the module finishes loading', async () => {
  const stage = document.createElement('div')
  const hook = renderHook(() => useDesktopStory({stage: () => stage}))
  hook.cleanup()
  await Promise.all([import('gsap'), import('gsap/Observer')])
  expect(Observer.create).not.toHaveBeenCalled()
  expect(disconnect).toHaveBeenCalledOnce()
})
