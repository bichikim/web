import {mockNativeWebview} from '../fixtures/native-webview'
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {afterEach, beforeEach, expect, test, vi} from 'vitest'
import {SPoffoWidget} from '../../src/components/SPoffoWidget'
import {useWidget} from '../../src/features/poffo/use-widget'
import 'virtual:uno.css'

vi.mock('../../src/features/poffo/use-widget', () => ({useWidget: vi.fn()}))
vi.mock('@tauri-apps/api/webview', () => ({getCurrentWebview: vi.fn()}))
beforeEach(() => {
  mockNativeWebview()
})
vi.mock('@tauri-apps/api/core', async (original) => ({
  ...(await original<typeof import('@tauri-apps/api/core')>()),
  isTauri: () => true,
}))
const native = {
  outerPosition: vi.fn(async () => ({x: 100, y: 200})),
  scaleFactor: vi.fn(async () => 1),
  setPosition: vi.fn(async () => undefined),
}
vi.mock('@tauri-apps/api/window', async (original) => ({
  ...(await original<typeof import('@tauri-apps/api/window')>()),
  getCurrentWindow: () => native,
}))
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.clearAllMocks()
})

const pointerEvent = (type: string, timeStamp: number, x = 200, y = 200) => {
  const event = new PointerEvent(type, {
    bubbles: true,
    button: 0,
    clientX: x,
    clientY: y,
    pointerId: 1,
    screenX: x,
    screenY: y,
  })
  Object.defineProperty(event, 'timeStamp', {value: timeStamp})
  return event
}

const setup = () => {
  vi.mocked(useWidget).mockReturnValue({
    agentBindings: () => undefined,
    assetId: () => null,
    drag: vi.fn(),
    error: () => null,
    lipsync: () => undefined,
    load: vi.fn(),
    menuActions: () => [],
    motionId: () => null,
    report: vi.fn(),
    saveSize: vi.fn(),
    semanticBindings: () => undefined,
    toggleAction: vi.fn(),
    touch: () => undefined,
    tracking: () => 'off',
    trackingBindings: () => undefined,
    trackingOptions: () => undefined,
  })
  render(() => <SPoffoWidget id="countdown" />)
  const widget = screen.getByRole('main', {name: 'Poffo 위젯'})
  vi.spyOn(widget, 'setPointerCapture').mockImplementation(() => undefined)
  vi.spyOn(widget, 'hasPointerCapture').mockReturnValue(false)
  let frame: FrameRequestCallback = () => undefined
  vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation((callback) => {
    frame = callback
    return 1
  })
  vi.spyOn(globalThis, 'cancelAnimationFrame').mockImplementation(() => undefined)
  return {frame: (time: number) => frame(time), widget}
}

test('should complete the indicator and enable movement together after a 1.5-second hold', async () => {
  const {frame, widget} = setup()
  fireEvent(widget, pointerEvent('pointerdown', 10_000))
  frame(10_750)
  const progress = screen.getByRole('progressbar', {name: '캐릭터 이동 준비'})
  expect(progress).toHaveAttribute('aria-valuemax', '1.5')
  await expect.poll(() => progress.getAttribute('aria-valuenow')).toBe('0.75')
  const ring = progress.querySelector('circle[pathLength="1"]')!
  expect(Number.parseFloat(getComputedStyle(ring).strokeDashoffset)).toBeCloseTo(0.5)
  frame(11_499)
  expect(widget.classList.contains('cursor-grabbing')).toBe(false)
  frame(11_500)
  await expect.poll(() => progress.getAttribute('aria-valuenow')).toBe('1.5')
  expect(widget.classList.contains('cursor-grabbing')).toBe(true)
  expect(Number.parseFloat(getComputedStyle(ring).strokeDashoffset)).toBe(0)
  expect(native.setPosition).not.toHaveBeenCalled()
  fireEvent(widget, pointerEvent('pointermove', 11_500, 220, 210))
  await expect
    .poll(() => native.setPosition.mock.lastCall)
    .toEqual([expect.objectContaining({x: 120, y: 210})])
  fireEvent(widget, pointerEvent('pointerup', 11_500, 220, 210))
  expect(screen.queryByRole('progressbar')).toBeNull()
  fireEvent(widget, pointerEvent('pointerdown', 20_000))
  fireEvent(widget, pointerEvent('pointermove', 21_500, 220, 210))
  await expect.poll(() => screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('1.5')
  expect(widget.classList.contains('cursor-grabbing')).toBe(true)
  await expect
    .poll(() => native.setPosition.mock.lastCall)
    .toEqual([expect.objectContaining({x: 120, y: 210})])
  fireEvent(widget, pointerEvent('pointerup', 21_500, 220, 210))
  expect(screen.queryByRole('progressbar')).toBeNull()
})

test('should keep the indicator incomplete until a delayed native position makes dragging possible', async () => {
  const preparation = Promise.withResolvers<{x: number; y: number}>()
  native.outerPosition.mockReturnValueOnce(preparation.promise)
  const {frame, widget} = setup()
  fireEvent(widget, pointerEvent('pointerdown', 10_000))
  frame(11_500)
  const progress = screen.getByRole('progressbar', {name: '캐릭터 이동 준비'})
  const ring = progress.querySelector('circle[pathLength="1"]')!
  expect(Number(progress.getAttribute('aria-valuenow'))).toBeLessThan(1.5)
  expect(Number.parseFloat(getComputedStyle(ring).strokeDashoffset)).toBeGreaterThan(0)
  expect(widget.classList.contains('cursor-grabbing')).toBe(false)
  fireEvent(widget, pointerEvent('pointermove', 11_600, 220, 210))
  expect(native.setPosition).not.toHaveBeenCalled()
  preparation.resolve({x: 100, y: 200})
  await expect.poll(() => progress.getAttribute('aria-valuenow')).toBe('1.5')
  expect(widget.classList.contains('cursor-grabbing')).toBe(true)
  expect(Number.parseFloat(getComputedStyle(ring).strokeDashoffset)).toBe(0)
  await expect
    .poll(() => native.setPosition.mock.lastCall)
    .toEqual([expect.objectContaining({x: 120, y: 210})])
  fireEvent(widget, pointerEvent('pointerup', 11_600, 220, 210))
  expect(screen.queryByRole('progressbar')).toBeNull()
})
