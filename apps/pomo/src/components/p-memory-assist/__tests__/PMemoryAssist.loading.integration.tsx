/** @vitest-environment jsdom */
import {fireEvent, render, screen} from '@solidjs/testing-library'
import {afterEach, expect, it, vi} from 'vitest'
import {PMemoryAssist} from '../PMemoryAssist'
import {PModelDownloadProvider} from '../../../features/model-download'

interface LoadedContent {
  readonly PMemoryAssistContent: () => string
}

const loading = vi.hoisted(() => {
  let resolve: (value: LoadedContent) => void = () => undefined
  let resolveStarted: () => void = () => undefined
  let resolveContentRendered: () => void = () => undefined
  const promise = new Promise<LoadedContent>((done) => {
    resolve = done
  })
  const startedPromise = new Promise<void>((done) => {
    resolveStarted = done
  })
  const contentRenderedPromise = new Promise<void>((done) => {
    resolveContentRendered = done
  })
  return {
    contentRendered: vi.fn(resolveContentRendered),
    contentRenderedPromise,
    promise,
    resolve,
    started: vi.fn(resolveStarted),
    startedPromise,
  }
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
  render(() => (
    <PModelDownloadProvider>
      <PMemoryAssist />
    </PModelDownloadProvider>
  ))
  const trigger = screen.getByRole('button', {name: '생각 보조'})
  await loading.startedPromise
  expect(loading.started).toHaveBeenCalledOnce()
  fireEvent.click(trigger)
  expect(screen.getByRole('dialog', {name: 'Pomofi 생각 보조'})).toBeVisible()
  expect(screen.getByRole('status')).toBeVisible()
  fireEvent.click(screen.getByRole('button', {name: '닫기'}))
  expect(screen.queryByRole('dialog')).toBeNull()
  loading.resolve({
    PMemoryAssistContent: () => {
      loading.contentRendered()
      return '준비된 내용'
    },
  })
  await Promise.resolve()
  expect(screen.queryByRole('dialog')).toBeNull()
  expect(screen.getByRole('button', {name: '생각 보조'})).toBe(trigger)
  fireEvent.click(trigger)
  await loading.contentRenderedPromise
  expect(screen.getByText('준비된 내용')).toBeVisible()
  expect(screen.queryByRole('status')).toBeNull()
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})
