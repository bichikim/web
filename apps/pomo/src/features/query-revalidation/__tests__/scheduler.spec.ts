import {batch, createRoot, createSignal} from 'solid-js'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

vi.mock('@solidjs/router', () => ({revalidate: vi.fn()}))

import {revalidate} from '@solidjs/router'

import {createQueryRevalidationScheduler, type QueryRevalidationSchedule} from '../scheduler'

const NOW = new Date('2026-09-02T09:00:00.000Z')

interface SchedulerRoot {
  readonly dispose: () => void
  readonly setKey: (key: string) => void
  readonly setSchedule: (schedule: QueryRevalidationSchedule) => void
}

const createSchedulerRoot = (
  initialSchedule: QueryRevalidationSchedule,
  initialKey = 'weather-feed["seoul"]',
): SchedulerRoot => {
  let disposeRoot: () => void = () => undefined
  let setKey: SchedulerRoot['setKey'] = () => undefined
  let setSchedule: SchedulerRoot['setSchedule'] = () => undefined

  createRoot((dispose) => {
    disposeRoot = dispose
    const [key, updateKey] = createSignal(initialKey)
    const [schedule, updateSchedule] = createSignal<QueryRevalidationSchedule>(initialSchedule)
    setKey = updateKey
    setSchedule = updateSchedule
    createQueryRevalidationScheduler({key, schedule})
  })

  return {dispose: disposeRoot, setKey, setSchedule}
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
  vi.mocked(revalidate).mockResolvedValue(undefined)
})

afterEach(() => {
  vi.clearAllMocks()
  vi.useRealTimers()
})

it('should revalidate the selected query after the requested delay', async () => {
  const root = createSchedulerRoot({kind: 'after-delay', milliseconds: 2_000})

  await vi.advanceTimersByTimeAsync(1_999)
  expect(revalidate).not.toHaveBeenCalled()

  await vi.advanceTimersByTimeAsync(1)
  expect(revalidate).toHaveBeenCalledOnce()
  expect(revalidate).toHaveBeenCalledWith('weather-feed["seoul"]')
  root.dispose()
})

it('should calculate an absolute revalidation time and clamp past times', async () => {
  const futureRoot = createSchedulerRoot({
    kind: 'at-time',
    timestamp: NOW.getTime() + 3_000,
  })

  await vi.advanceTimersByTimeAsync(3_000)
  expect(revalidate).toHaveBeenCalledWith('weather-feed["seoul"]')
  futureRoot.dispose()

  vi.mocked(revalidate).mockClear()
  const pastRoot = createSchedulerRoot({kind: 'at-time', timestamp: NOW.getTime() - 1})
  await vi.advanceTimersByTimeAsync(0)
  expect(revalidate).toHaveBeenCalledOnce()
  pastRoot.dispose()
})

it('should not schedule revalidation when the external policy returns null', async () => {
  const root = createSchedulerRoot(null)

  await vi.runAllTimersAsync()
  expect(revalidate).not.toHaveBeenCalled()
  root.dispose()
})

it('should replace the pending timer when its key or schedule changes', async () => {
  const root = createSchedulerRoot({kind: 'after-delay', milliseconds: 5_000})

  await vi.advanceTimersByTimeAsync(1_000)
  batch(() => {
    root.setKey('weather-feed["busan"]')
    root.setSchedule({kind: 'after-delay', milliseconds: 2_000})
  })

  await vi.advanceTimersByTimeAsync(1_999)
  expect(revalidate).not.toHaveBeenCalled()
  await vi.advanceTimersByTimeAsync(1)
  expect(revalidate).toHaveBeenCalledWith('weather-feed["busan"]')

  await vi.advanceTimersByTimeAsync(2_000)
  expect(revalidate).toHaveBeenCalledOnce()
  root.dispose()
})

it('should cancel pending revalidation when disposed or disabled', async () => {
  const disposedRoot = createSchedulerRoot({kind: 'after-delay', milliseconds: 1_000})
  disposedRoot.dispose()
  await vi.advanceTimersByTimeAsync(1_000)
  expect(revalidate).not.toHaveBeenCalled()

  const disabledRoot = createSchedulerRoot({kind: 'after-delay', milliseconds: 1_000})
  disabledRoot.setSchedule(null)
  await vi.advanceTimersByTimeAsync(1_000)
  expect(revalidate).not.toHaveBeenCalled()
  disabledRoot.dispose()
})

it('should contain a rejected Router revalidation inside the scheduled task', async () => {
  vi.mocked(revalidate).mockRejectedValueOnce(new Error('transition unavailable'))
  const root = createSchedulerRoot({kind: 'after-delay', milliseconds: 1_000})

  await vi.advanceTimersByTimeAsync(1_000)

  expect(revalidate).toHaveBeenCalledOnce()
  root.dispose()
})
