/** @vitest-environment jsdom */
import {fireEvent, render, screen, waitFor} from '@solidjs/testing-library'
import {afterEach, expect, it, vi} from 'vitest'
import {PMemoryAssist} from '../PMemoryAssist'
import {PModelDownloadProvider} from '../../../features/model-download'
vi.mock('../../memory-assist/Content', () => {
  throw new Error('chunk unavailable')
})
it('should keep the modal closable after preloading fails', async () => {
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
  fireEvent.click(trigger)
  expect(await screen.findByRole('alert')).toBeVisible()
  expect(screen.queryByRole('status')).toBeNull()
  fireEvent.click(screen.getByRole('button', {name: '닫기'}))
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  expect(screen.getByRole('button', {name: '생각 보조'})).toBe(trigger)
}, 1_000)
afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})
