/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, beforeEach, expect, test, vi} from 'vitest'
import {FileLoadingDialog} from '../FileLoadingDialog'

beforeEach(() => vi.useFakeTimers())
afterEach(async () => {
  cleanup()
  await vi.runAllTimersAsync()
  vi.useRealTimers()
})

test('should announce the selected file and let the user cancel loading', () => {
  const onCancel = vi.fn()
  render(() => <FileLoadingDialog fileName="ren.json" onCancel={onCancel} />)
  expect(screen.getByRole('dialog', {name: '불러오는 중…'})).toBeVisible()
  expect(screen.getByRole('status')).toHaveTextContent('불러오는 중…')
  expect(screen.getByText('ren.json')).toBeVisible()
  fireEvent.click(screen.getByRole('button', {name: '취소'}))
  expect(onCancel).toHaveBeenCalledOnce()
})

test('should close after the pending file finishes', () => {
  const [fileName, setFileName] = createSignal<string | null>('ren.json')
  render(() => <FileLoadingDialog fileName={fileName()} onCancel={vi.fn()} />)
  setFileName(null)
  expect(screen.getByRole('dialog')).toHaveAttribute('data-closed')
})

test('should cancel Escape from the focused dialog even when a background layer prevents its default', () => {
  const prevent = (event: KeyboardEvent) => event.preventDefault()
  document.addEventListener('keydown', prevent)
  try {
    const onCancel = vi.fn()
    render(() => <FileLoadingDialog fileName="model.json" onCancel={onCancel} />)
    fireEvent.keyDown(screen.getByRole('button', {name: '취소'}), {key: 'Escape'})
    expect(onCancel).toHaveBeenCalledOnce()
  } finally {
    document.removeEventListener('keydown', prevent)
  }
})

const LoadingExample = () => {
  const [fileName, setFileName] = createSignal<string | null>(null)
  return (
    <>
      <button type="button" onClick={() => setFileName('model.json')}>
        파일 선택
      </button>
      <FileLoadingDialog fileName={fileName()} onCancel={() => setFileName(null)} />
    </>
  )
}

test('should return focus to the file action after cancellation without a Dialog trigger', async () => {
  render(() => <LoadingExample />)
  const trigger = screen.getByRole('button', {name: '파일 선택'})
  trigger.focus()
  fireEvent.click(trigger)
  const dialog = screen.getByRole('dialog', {name: '불러오는 중…'})
  const overlay = dialog.previousElementSibling
  const cancel = screen.getByRole('button', {name: '취소'})
  await vi.runAllTimersAsync()
  expect(cancel).toHaveFocus()
  fireEvent.click(cancel)
  // JSDOM has no editor CSS; complete the primitive's exit animation.
  const animationEnd = new Event('animationend', {bubbles: true})
  Object.defineProperty(animationEnd, 'animationName', {value: ''})
  dialog.dispatchEvent(animationEnd)
  overlay?.dispatchEvent(animationEnd)
  await vi.runAllTimersAsync()
  expect(trigger).toHaveFocus()
})
