/** @vitest-environment jsdom */

import {afterEach, describe, expect, it, vi} from 'vitest'

import {createPSilentMouthReturn, P_SILENT_MOUTH_RETURN_DELAY_MS} from '../silent-mouth-return'

afterEach(() => {
  vi.useRealTimers()
})

describe('createPSilentMouthReturn', () => {
  it('should return the mouth after 100ms of continuous silence', () => {
    vi.useFakeTimers()
    const onReturn = vi.fn()
    const silentMouthReturn = createPSilentMouthReturn(onReturn)

    silentMouthReturn.schedule()
    silentMouthReturn.schedule()
    vi.advanceTimersByTime(P_SILENT_MOUTH_RETURN_DELAY_MS - 1)
    expect(onReturn).not.toHaveBeenCalled()

    vi.advanceTimersByTime(1)
    expect(onReturn).toHaveBeenCalledOnce()

    silentMouthReturn.schedule()
    vi.advanceTimersByTime(P_SILENT_MOUTH_RETURN_DELAY_MS)
    expect(onReturn).toHaveBeenCalledOnce()
  })

  it('should keep the speaking mouth when speech resumes within 100ms', () => {
    vi.useFakeTimers()
    const onReturn = vi.fn()
    const silentMouthReturn = createPSilentMouthReturn(onReturn)

    silentMouthReturn.schedule()
    vi.advanceTimersByTime(P_SILENT_MOUTH_RETURN_DELAY_MS - 1)
    silentMouthReturn.cancel()
    vi.advanceTimersByTime(1)

    expect(onReturn).not.toHaveBeenCalled()
  })
})
