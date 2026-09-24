/** @vitest-environment jsdom */
import {renderHook} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'

import {useLocalDate} from '../features/civil-date/use-local-date'

afterEach(() => {
  vi.unstubAllEnvs()
})

it('should refresh the civil date when the configured time zone changes', () => {
  vi.stubEnv('TZ', 'UTC')
  const now = new Date('2026-09-01T20:00:00.000Z')
  const runtime = {
    now: () => now,
    schedule: vi.fn<(callback: () => void, delay: number) => () => void>(() => vi.fn()),
    subscribe: vi.fn<(callback: (hidden: boolean) => void) => () => void>(() => vi.fn()),
  }
  const [timeZone, setTimeZone] = createSignal('Asia/Seoul')
  const view = renderHook(() => useLocalDate({runtime, timeZone: timeZone()}))

  expect(view.result()).toBe('2026-09-02')

  setTimeZone('America/New_York')

  expect(view.result()).toBe('2026-09-01')
  view.cleanup()
})
