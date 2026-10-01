/** @vitest-environment jsdom */
import {fireEvent, render, screen} from '@solidjs/testing-library'
import {afterEach, expect, it, vi} from 'vitest'
import {PMemoryAssist} from '../PMemoryAssist'

interface LoadedContent {
  readonly PMemoryAssistContent: () => string
}

const loading = vi.hoisted(() => {
  let resolve: (value: LoadedContent) => void = () => undefined
  let resolveStarted: () => void = () => undefined
  const promise = new Promise<LoadedContent>((done) => {
    resolve = done
  })
  const startedPromise = new Promise<void>((done) => {
    resolveStarted = done
  })
  const started = vi.fn(() => resolveStarted())
  return {promise, resolve, started, startedPromise}
})
vi.mock('../../memory-assist/Content', () => {
  loading.started()
  return loading.promise
})

it('should open and close while preloading and reveal content without replacing the trigger', async () => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
      unobserve() {}
    },
  )
  const readStyles = globalThis.getComputedStyle.bind(globalThis)
  vi.spyOn(globalThis, 'getComputedStyle').mockImplementation((element) => {
    const styles = readStyles(element)
    Object.defineProperty(styles, 'animationName', {configurable: true, value: 'none'})
    return styles
  })
  const view = render(() => <PMemoryAssist />)
  const trigger = view.container.querySelector<HTMLButtonElement>('button[aria-label="기억보조"]')
  expect(trigger).not.toBeNull()
  await loading.startedPromise
  expect(loading.started).toHaveBeenCalledOnce()
  fireEvent.click(trigger!)
  const dialog = document.querySelector('[role="dialog"]')
  expect(dialog).toBeVisible()
  expect(document.querySelector('[role="status"]')).toBeVisible()
  fireEvent.click(screen.getByRole('button', {name: '닫기'}))
  expect(document.querySelector('[role="dialog"]')).toBeNull()
  loading.resolve({PMemoryAssistContent: () => '준비된 내용'})
  await Promise.resolve()
  expect(document.querySelector('[role="dialog"]')).toBeNull()
  expect(view.container.querySelector('button[aria-label="기억보조"]')).toBe(trigger)
  fireEvent.click(trigger!)
  const content = await screen.findByText('준비된 내용')
  expect(content).toBeVisible()
  expect(document.querySelector('[role="status"]')).toBeNull()
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})
