/** @vitest-environment jsdom */
import {cleanup, renderHook} from '@solidjs/testing-library'
import {afterEach, expect, test, vi} from 'vitest'
import {createSignal} from 'solid-js'
import {useSettingsNavigation} from '../use-settings-navigation'

afterEach(cleanup)

test('should show the requested path before changing content and discard older queued requests', async () => {
  const [page, setPage] = createSignal('background')
  const change = vi.fn((value: string) => setPage(value))
  const scroll = vi.fn()
  const {result} = renderHook(() =>
    useSettingsNavigation(
      () => ({
        label: 'Page',
        onSelect: change,
        options: [
          {label: 'Background', value: 'background'},
          {label: 'Widgets', value: 'widget'},
          {label: 'General', value: 'general'},
        ],
        value: page(),
      }),
      scroll,
    ),
  )
  const first = result.select(result.trail()[0]!, 'widget')
  const second = result.select(result.trail()[0]!, 'general')
  expect(result.trail()[0]?.value).toBe('general')
  expect(result.pending()).toBe(true)
  expect(page()).toBe('background')
  await Promise.all([first, second])
  expect(change).toHaveBeenCalledExactlyOnceWith('general')
  expect(scroll).toHaveBeenCalledOnce()
  expect(result.pending()).toBe(false)
})

test('should drop queued navigation when its owner is disposed', async () => {
  const change = vi.fn()
  const {result, cleanup: dispose} = renderHook(() =>
    useSettingsNavigation(() => ({label: 'Page', options: [], value: 'initial'})),
  )
  const request = result.navigate([{label: 'Next', options: [], value: 'next'}], change)
  dispose()
  await request
  expect(change).not.toHaveBeenCalled()
})
