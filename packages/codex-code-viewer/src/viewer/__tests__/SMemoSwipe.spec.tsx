/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {afterEach, expect, it, vi} from 'vitest'
import {createSignal} from 'solid-js'
import {SMemoSwipe} from '../SMemoSwipe'

const pointer = (type: string, x: number, y = 0) =>
  Object.assign(new MouseEvent(type, {bubbles: true, button: 0, clientX: x, clientY: y}), {
    isPrimary: true,
    pointerId: 1,
    pointerType: 'mouse',
  })
const prepare = () => {
  const row = screen.getByRole('group', {name: '메모 작업'})
  Object.defineProperty(row.firstElementChild!, 'clientWidth', {value: 80})
  Object.defineProperty(row, 'setPointerCapture', {value: vi.fn()})
  row.scrollLeft = 80
  return row
}
const swipe = (row: HTMLElement, distance: number) => {
  fireEvent(row, pointer('pointerdown', 200))
  fireEvent(row, pointer('pointermove', 200 + distance))
  fireEvent(row, pointer('pointerup', 200 + distance))
}
afterEach(() => {
  cleanup()
  localStorage.clear()
  vi.restoreAllMocks()
})

it('should add to chat once on releasing a left swipe and keep the memo', async () => {
  localStorage.setItem('codex-code-viewer.language', 'ko')
  const attach = vi.fn().mockResolvedValue(undefined)
  const remove = vi.fn()
  render(() => (
    <SMemoSwipe onAttach={attach} onRemove={remove}>
      메모 내용
    </SMemoSwipe>
  ))
  const row = prepare()
  fireEvent(row, pointer('pointerdown', 200))
  fireEvent(row, pointer('pointermove', 110))
  expect(attach).not.toHaveBeenCalled()
  fireEvent(row, pointer('pointerup', 110))
  await Promise.resolve()
  expect(attach).toHaveBeenCalledExactlyOnceWith()
  expect(remove).not.toHaveBeenCalled()
  expect(row.scrollLeft).toBe(80)
  expect(screen.getByText('메모 내용')).toBeInTheDocument()
})

it('should remove once on releasing a right swipe without adding to chat', async () => {
  localStorage.setItem('codex-code-viewer.language', 'ko')
  const attach = vi.fn()
  const remove = vi.fn().mockResolvedValue(true)
  render(() => (
    <SMemoSwipe onAttach={attach} onRemove={remove}>
      메모 내용
    </SMemoSwipe>
  ))
  const row = prepare()
  swipe(row, 90)
  await Promise.resolve()
  expect(remove).toHaveBeenCalledExactlyOnceWith()
  expect(attach).not.toHaveBeenCalled()
  expect(row.scrollLeft).toBe(80)
})

it('should leave vertical movement and interactive controls outside swiping', () => {
  localStorage.setItem('codex-code-viewer.language', 'ko')
  const remove = vi.fn()
  render(() => (
    <SMemoSwipe onRemove={remove}>
      <button>수정</button>
    </SMemoSwipe>
  ))
  const row = prepare()
  fireEvent(row, pointer('pointerdown', 200))
  fireEvent(row, pointer('pointermove', 198, 30))
  fireEvent(row, pointer('pointermove', 110, 30))
  fireEvent(row, pointer('pointerup', 110, 30))
  fireEvent(screen.getByRole('button', {name: '수정'}), pointer('pointerdown', 200))
  fireEvent(row, pointer('pointermove', 290))
  fireEvent(row, pointer('pointerup', 290))
  expect(row.scrollLeft).toBe(80)
  expect(remove).not.toHaveBeenCalled()
})

it('should cancel a swipe with pointer cancellation or Escape without executing it', () => {
  localStorage.setItem('codex-code-viewer.language', 'ko')
  const remove = vi.fn()
  render(() => <SMemoSwipe onRemove={remove}>메모 내용</SMemoSwipe>)
  const row = prepare()
  fireEvent(row, pointer('pointerdown', 200))
  fireEvent(row, pointer('pointermove', 290))
  fireEvent(row, pointer('pointercancel', 290))
  expect(row.scrollLeft).toBe(80)
  fireEvent(row, pointer('pointerdown', 200))
  fireEvent(row, pointer('pointermove', 290))
  fireEvent.keyDown(row, {key: 'Escape'})
  fireEvent(row, pointer('pointerup', 290))
  expect(row.scrollLeft).toBe(80)
  expect(remove).not.toHaveBeenCalled()
})

it('should execute native trackpad or touch scrolling only after it ends', async () => {
  localStorage.setItem('codex-code-viewer.language', 'ko')
  const attach = vi.fn().mockResolvedValue(undefined)
  const remove = vi.fn().mockResolvedValue(true)
  render(() => (
    <SMemoSwipe onAttach={attach} onRemove={remove}>
      메모 내용
    </SMemoSwipe>
  ))
  const row = prepare()
  fireEvent.wheel(row, {deltaX: 80, deltaY: 0})
  fireEvent.scroll(row, {target: {scrollLeft: 160}})
  expect(attach).not.toHaveBeenCalled()
  fireEvent(row, new Event('scrollend'))
  await Promise.resolve()
  expect(attach).toHaveBeenCalledExactlyOnceWith()
  expect(row.scrollLeft).toBe(80)
  fireEvent(row, new Event('scrollend'))
  expect(attach).toHaveBeenCalledTimes(1)
  fireEvent.wheel(row, {deltaX: -80, deltaY: 0})
  row.scrollLeft = 0
  fireEvent(row, new Event('scrollend'))
  await Promise.resolve()
  expect(remove).toHaveBeenCalledExactlyOnceWith()
})

it('should ignore scrolling without user swipe intent', () => {
  localStorage.setItem('codex-code-viewer.language', 'ko')
  const remove = vi.fn()
  render(() => <SMemoSwipe onRemove={remove}>메모 내용</SMemoSwipe>)
  const row = prepare()
  row.scrollLeft = 0
  fireEvent(row, new Event('scrollend'))
  expect(remove).not.toHaveBeenCalled()
  expect(row.scrollLeft).toBe(80)
})

it('should discard a cancelled native touch swipe before its scrollend arrives', () => {
  localStorage.setItem('codex-code-viewer.language', 'ko')
  const remove = vi.fn()
  render(() => <SMemoSwipe onRemove={remove}>메모 내용</SMemoSwipe>)
  const row = prepare()
  fireEvent.touchStart(row, {touches: [{identifier: 1}]})
  row.scrollLeft = 0
  fireEvent.touchCancel(row)
  fireEvent(row, new Event('scrollend'))
  expect(remove).not.toHaveBeenCalled()
  expect(row.scrollLeft).toBe(80)
})

it('should suppress gestures while disabled or while its action is pending', async () => {
  localStorage.setItem('codex-code-viewer.language', 'ko')
  const [disabled, setDisabled] = createSignal(false)
  const pending = Promise.withResolvers<void>()
  const attach = vi.fn().mockReturnValue(pending.promise)
  const remove = vi.fn()
  render(() => (
    <SMemoSwipe disabled={disabled()} onAttach={attach} onRemove={remove}>
      메모 내용
    </SMemoSwipe>
  ))
  const row = prepare()
  setDisabled(true)
  swipe(row, 90)
  expect(remove).not.toHaveBeenCalled()
  setDisabled(false)
  swipe(row, -90)
  swipe(row, -90)
  expect(attach).toHaveBeenCalledTimes(1)
  pending.resolve()
  await Promise.resolve()
  fireEvent(row, pointer('pointerdown', 200))
  fireEvent(row, pointer('pointermove', 290))
  setDisabled(true)
  fireEvent(row, pointer('pointerup', 290))
  expect(remove).not.toHaveBeenCalled()
  expect(row.scrollLeft).toBe(80)
})
