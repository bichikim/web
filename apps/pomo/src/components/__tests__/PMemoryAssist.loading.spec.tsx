/** @vitest-environment jsdom */
import {fireEvent, render, screen, waitFor} from '@solidjs/testing-library'
import {afterEach, expect, it, vi} from 'vitest'
import {PMemoryAssist} from '../PMemoryAssist'

interface LoadedContent {
  readonly PMemoryAssistContent: () => string
}

const loading = vi.hoisted(() => {
  let resolve: (value: LoadedContent) => void = () => undefined
  const promise = new Promise<LoadedContent>((done) => {
    resolve = done
  })
  return {promise, resolve, started: vi.fn()}
})
vi.mock('../memory-assist/Content', () => {
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
  const readStyles = window.getComputedStyle.bind(window)
  vi.spyOn(window, 'getComputedStyle').mockImplementation((element) => {
    const styles = readStyles(element)
    Object.defineProperty(styles, 'animationName', {configurable: true, value: 'none'})
    return styles
  })
  render(() => <PMemoryAssist />)
  const trigger = screen.getByRole('button', {name: '기억보조'})
  await waitFor(() => expect(loading.started).toHaveBeenCalledOnce())
  fireEvent.click(trigger)
  expect(screen.getByRole('dialog', {name: 'Pomofi 기억 보조'})).toBeVisible()
  expect(screen.getByRole('status')).toBeVisible()
  fireEvent.click(screen.getByRole('button', {name: '닫기'}))
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  loading.resolve({PMemoryAssistContent: () => '준비된 내용'})
  await Promise.resolve()
  expect(screen.queryByRole('dialog')).toBeNull()
  expect(screen.getByRole('button', {name: '기억보조'})).toBe(trigger)
  fireEvent.click(trigger)
  expect(await screen.findByText('준비된 내용')).toBeVisible()
  expect(screen.queryByRole('status')).toBeNull()
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})
