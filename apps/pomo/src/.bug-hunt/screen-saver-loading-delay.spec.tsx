/** @vitest-environment jsdom */

import {cleanup, renderHook} from '@solidjs/testing-library'
import {afterEach, expect, it, vi} from 'vitest'
import {PreferenceProvider} from 'src/hooks/use-preference'

import {useScreenSaver} from '../features/screen-saver/use-screen-saver'

const native = vi.hoisted(() => ({getItem: vi.fn(), setItem: vi.fn()}))
vi.mock('@apps-in-toss/web-framework', () => ({Storage: native}))

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  localStorage.clear()
})

it('should expose the default delay while the persisted preference is still loading', async () => {
  const pending = Promise.withResolvers<string | null>()
  native.getItem.mockReturnValue(pending.promise)

  const view = renderHook(() => useScreenSaver(), {wrapper: PreferenceProvider})

  expect(view.result.delay()).toBe('10m')

  pending.resolve(JSON.stringify('20m'))
  await vi.waitFor(() => expect(view.result.delay()).toBe('20m'))

  view.unmount()
})
