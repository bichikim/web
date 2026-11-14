/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, beforeEach, expect, test, vi} from 'vitest'
import {useCharacterPreview} from '../../features/character-preview'
import SPuppetCharacter from '../SPuppetCharacter'

vi.mock('../../features/character-preview', () => ({useCharacterPreview: vi.fn()}))

const lookAt = vi.fn()
const resize = vi.fn()
const observe = vi.fn()
const disconnect = vi.fn()
const move = (x: number, y: number) =>
  fireEvent(document, new MouseEvent('pointermove', {bubbles: true, clientX: x, clientY: y}))

beforeEach(() => {
  vi.mocked(useCharacterPreview).mockReturnValue({hitTest: vi.fn(), lookAt, resize})
  vi.stubGlobal(
    'ResizeObserver',
    vi.fn().mockImplementation(function observer() {
      return {disconnect, observe}
    }),
  )
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})

test('should follow the whole viewport and keep looking after leaving the character', () => {
  render(() => <SPuppetCharacter />)
  move(0, 0)
  expect(lookAt).toHaveBeenLastCalledWith({x: 0, y: 0})
  move(window.innerWidth, window.innerHeight)
  expect(lookAt).toHaveBeenLastCalledWith({x: window.innerWidth, y: window.innerHeight})
  move(window.innerWidth / 2, window.innerHeight / 2)
  expect(lookAt).toHaveBeenLastCalledWith({x: window.innerWidth / 2, y: window.innerHeight / 2})
  move(window.innerWidth, 0)
  fireEvent(screen.getByLabelText('흰 고양이 캐릭터 실시간 렌더링'), new MouseEvent('pointerleave'))
  expect(lookAt).toHaveBeenLastCalledWith({x: window.innerWidth, y: 0})
  move(globalThis.innerWidth * 2, -globalThis.innerHeight)
  expect(lookAt).toHaveBeenLastCalledWith({x: window.innerWidth * 2, y: -window.innerHeight})
  vi.stubGlobal('innerWidth', 800)
  vi.stubGlobal('innerHeight', 600)
  move(400, 300)
  expect(lookAt).toHaveBeenLastCalledWith({x: 400, y: 300})
})

test('should center and ignore movement while tracking is disabled, then follow again', () => {
  const [tracking, setTracking] = createSignal(true)
  render(() => <SPuppetCharacter tracking={tracking()} />)
  move(0, 0)
  setTracking(false)
  expect(lookAt).toHaveBeenLastCalledWith()
  lookAt.mockClear()
  move(window.innerWidth, window.innerHeight)
  expect(lookAt).not.toHaveBeenCalled()
  setTracking(true)
  move(window.innerWidth, window.innerHeight)
  expect(lookAt).toHaveBeenLastCalledWith({x: window.innerWidth, y: window.innerHeight})
})

test('should center outside the page and stop listening after unmount', () => {
  const view = render(() => <SPuppetCharacter />)
  move(0, 0)
  fireEvent(document, new MouseEvent('pointerleave'))
  expect(lookAt).toHaveBeenLastCalledWith()
  move(window.innerWidth, window.innerHeight)
  fireEvent(document.defaultView!, new Event('blur'))
  expect(lookAt).toHaveBeenLastCalledWith()
  view.unmount()
  lookAt.mockClear()
  move(0, 0)
  fireEvent(document.defaultView!, new Event('blur'))
  expect(lookAt).not.toHaveBeenCalled()
})

test('should resize with its host rather than the renderer-owned canvas dimensions', () => {
  const view = render(() => (
    <div>
      <SPuppetCharacter />
    </div>
  ))
  const canvas = screen.getByLabelText('흰 고양이 캐릭터 실시간 렌더링')
  expect(observe).toHaveBeenCalledExactlyOnceWith(canvas.parentElement)
  const callback = vi.mocked(ResizeObserver).mock.calls[0]![0]
  callback([], vi.mocked(ResizeObserver).mock.results[0]!.value)
  expect(resize).toHaveBeenCalledOnce()
  view.unmount()
  expect(disconnect).toHaveBeenCalledOnce()
})

test('should forward a reactive preset selection including none', () => {
  const [expression, setExpression] = createSignal<string | null>(null)
  render(() => <SPuppetCharacter expressionId={expression()} />)
  const options = vi.mocked(useCharacterPreview).mock.calls[0]![0]
  expect(options.expressionId?.()).toBeNull()
  setExpression('손하트')
  expect(options.expressionId?.()).toBe('손하트')
  setExpression(null)
  expect(options.expressionId?.()).toBeNull()
})

test('should forward speech mouth poses and release them when playback stops', () => {
  const [mouth, setMouth] = createSignal<{form: number; open: number} | null>(null)
  render(() => <SPuppetCharacter mouth={mouth()} />)
  const options = vi.mocked(useCharacterPreview).mock.calls[0]![0]
  setMouth({form: -1, open: 0.7})
  expect(options.mouth?.()).toEqual({form: -1, open: 0.7})
  setMouth(null)
  expect(options.mouth?.()).toBeNull()
})
