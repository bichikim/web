/** @vitest-environment jsdom */
import {render, screen} from '@solidjs/testing-library'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {RefinementIndicator} from '../RefinementIndicator'

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(1_000)
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

it('should keep the initial glyph until a frame and cycle at 120ms using wall time', () => {
  const request = vi.spyOn(globalThis, 'requestAnimationFrame').mockReturnValue(1)
  const view = render(() => <RefinementIndicator />)
  const status = screen.getByRole('status', {name: '답변을 수정하는 중'})
  expect(status.textContent).toBe('뷁뚱')
  expect(request).toHaveBeenCalledTimes(1)

  for (const [elapsed, glyph] of [
    [119, '뷁뚱'],
    [120, '휵쟝'],
    [240, '먕귱'],
    [360, '륭쫑'],
    [480, '뷁뚱'],
  ] as const) {
    vi.setSystemTime(1_000 + elapsed)
    const callback = request.mock.calls.at(-1)![0]
    callback(99_999)
    expect(status.textContent).toBe(glyph)
  }
  view.unmount()
})

it('should cancel a pending frame and ignore its callback after unmount', () => {
  const request = vi.spyOn(globalThis, 'requestAnimationFrame').mockReturnValue(7)
  const cancel = vi.spyOn(globalThis, 'cancelAnimationFrame')
  const view = render(() => <RefinementIndicator />)
  const callback = request.mock.calls[0]![0]
  view.unmount()
  expect(cancel).toHaveBeenCalledExactlyOnceWith(7)
  callback(120)
  expect(request).toHaveBeenCalledTimes(1)
})

it('should not schedule again when unmounted during a frame', () => {
  const request = vi.spyOn(globalThis, 'requestAnimationFrame').mockReturnValue(1)
  const view = render(() => <RefinementIndicator />)
  vi.spyOn(Date, 'now').mockImplementationOnce(() => {
    view.unmount()
    return 1_120
  })
  request.mock.calls[0]![0](120)
  expect(request).toHaveBeenCalledTimes(1)
})

it('should rethrow an update error and stop subsequent frames', () => {
  const request = vi.spyOn(globalThis, 'requestAnimationFrame').mockReturnValue(1)
  const view = render(() => <RefinementIndicator />)
  const callback = request.mock.calls[0]![0]
  const error = new Error('Clock unavailable')
  vi.spyOn(Date, 'now').mockImplementationOnce(() => {
    throw error
  })
  expect(() => callback(120)).toThrow(error)
  expect(request).toHaveBeenCalledTimes(1)
  callback(240)
  expect(request).toHaveBeenCalledTimes(1)
  view.unmount()
})
