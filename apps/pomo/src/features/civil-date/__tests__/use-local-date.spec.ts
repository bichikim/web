/** @vitest-environment jsdom */
import {renderHook} from '@solidjs/testing-library'
import {expect, it, vi} from 'vitest'
import {useLocalDate} from '../use-local-date'

const createRuntime = (now: () => Date) => ({
  now,
  schedule: vi.fn<(callback: () => void, delay: number) => () => void>(() => vi.fn()),
  subscribe: vi.fn<(callback: (hidden: boolean) => void) => () => void>(() => vi.fn()),
})

it.each([undefined, new Date(2026, 11, 30)])(
  'should retain the initial date until mount: %s',
  (initialDate) => {
    const runtime = createRuntime(() => new Date(2026, 11, 31))
    const view = renderHook(() => {
      const date = useLocalDate({initialDate, runtime})
      return {date, initial: date()}
    })
    expect(view.result.initial).toBe(initialDate === undefined ? '' : '2026-12-30')
    expect(view.result.date()).toBe('2026-12-31')
    view.cleanup()
  },
)

it('should refresh at midnight and replace and dispose scheduled work', () => {
  let now = new Date(2026, 11, 31, 23, 59, 59)
  const runtime = createRuntime(() => now)
  const view = renderHook(() => useLocalDate({runtime}))
  expect(runtime.schedule).toHaveBeenLastCalledWith(expect.any(Function), 1000)
  now = new Date(2027, 0, 1)
  runtime.schedule.mock.calls[0][0]()
  expect(view.result()).toBe('2027-01-01')
  expect(runtime.schedule.mock.results[0].value).toHaveBeenCalledOnce()
  expect(runtime.schedule).toHaveBeenLastCalledWith(expect.any(Function), 86_400_000)
  view.cleanup()
  expect(runtime.schedule.mock.results[1].value).toHaveBeenCalledOnce()
  expect(runtime.subscribe.mock.results[0].value).toHaveBeenCalledOnce()
})

it('should format and schedule at midnight in a configured time zone', () => {
  vi.stubEnv('TZ', 'UTC')
  try {
    let now = new Date('2026-08-31T16:00:00.000Z')
    const runtime = createRuntime(() => now)
    const view = renderHook(() => useLocalDate({runtime, timeZone: 'Asia/Seoul'}))

    expect(view.result()).toBe('2026-09-01')
    expect(runtime.schedule).toHaveBeenLastCalledWith(expect.any(Function), 82_800_000)
    now = new Date('2026-09-02T15:00:00.000Z')
    runtime.schedule.mock.calls[0][0]()
    expect(view.result()).toBe('2026-09-03')
    expect(runtime.schedule).toHaveBeenLastCalledWith(expect.any(Function), 86_400_000)
    view.cleanup()
  } finally {
    vi.unstubAllEnvs()
  }
})

it('should refresh on visible return but not on hidden notification', () => {
  let now = new Date(2026, 11, 31)
  const runtime = createRuntime(() => now)
  const view = renderHook(() => useLocalDate({runtime}))
  const notify = runtime.subscribe.mock.calls[0][0]
  now = new Date(2027, 0, 3, 23, 59, 59)
  notify(true)
  expect(view.result()).toBe('2026-12-31')
  notify(false)
  expect(view.result()).toBe('2027-01-03')
  expect(runtime.schedule.mock.results[0].value).toHaveBeenCalledOnce()
  expect(runtime.schedule).toHaveBeenLastCalledWith(expect.any(Function), 1000)
  view.cleanup()
})

it.each([
  [2026, 2, 8],
  [2026, 10, 1],
])('should schedule the actual local midnight across DST: %i/%i/%i', (year, month, day) => {
  let now = new Date(year, month, day)
  const tomorrow = new Date(year, month, day + 1)
  const runtime = createRuntime(() => now)
  const view = renderHook(() => useLocalDate({runtime}))
  expect(runtime.schedule).toHaveBeenLastCalledWith(
    expect.any(Function),
    tomorrow.getTime() - now.getTime(),
  )
  const initial = view.result()
  now = tomorrow
  runtime.schedule.mock.calls[0][0]()
  expect(view.result()).not.toBe(initial)
  view.cleanup()
})
