/** @vitest-environment jsdom */
import {fireEvent, render, waitFor} from '@solidjs/testing-library'
import {afterEach, expect, it, vi} from 'vitest'
import {PSettings} from '../PSettings'
vi.mock('../../settings/Content', () => {
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
  const view = render(() => <PSettings />)
  const trigger = view.container.querySelector<HTMLButtonElement>('button[aria-label="설정"]')
  expect(trigger).not.toBeNull()
  fireEvent.click(trigger!)
  await waitFor(() => expect(document.querySelector('[role="alert"]')).toBeVisible())
  expect(document.querySelector('[role="status"]')).toBeNull()
  fireEvent.click(document.querySelector<HTMLButtonElement>('button[aria-label="닫기"]')!)
  await waitFor(() => expect(document.querySelector('[role="dialog"]')).toBeNull())
  expect(view.container.querySelector('button[aria-label="설정"]')).toBe(trigger)
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})
