import {effectScope} from 'vue'
import {describe, expect, it, vi} from 'vitest'
import {useUntilTo} from '../'

describe('until-to', () => {
  it('should change number to 0', () => {
    vi.useFakeTimers()
    const scope = effectScope()
    const untilTo = scope.run(() => useUntilTo(10))

    untilTo?.run(0, 1)

    expect(untilTo?.value.value).toBe(10)

    vi.advanceTimersByTime(100)

    expect(untilTo?.value.value).toBe(9)

    vi.advanceTimersByTime(100)

    expect(untilTo?.value.value).toBe(8)

    vi.advanceTimersByTime(800)

    expect(untilTo?.value.value).toBe(0)

    vi.advanceTimersByTime(100)

    expect(untilTo?.value.value).toBe(0)

    vi.advanceTimersByTime(100)

    scope.stop()
    vi.useRealTimers()
  })
  it('should stop changing number to 0', () => {
    vi.useFakeTimers()
    const scope = effectScope()
    const untilTo = scope.run(() => useUntilTo(10))

    untilTo?.run(0, 1)

    expect(untilTo?.value.value).toBe(10)

    vi.advanceTimersByTime(100)

    expect(untilTo?.value.value).toBe(9)

    vi.advanceTimersByTime(100)

    expect(untilTo?.value.value).toBe(8)

    untilTo?.stop()

    vi.advanceTimersByTime(800)

    expect(untilTo?.value.value).toBe(8)

    untilTo?.stop()
    vi.useRealTimers()
  })
  it('should rerun changing number to 0', () => {
    vi.useFakeTimers()
    const scope = effectScope()
    const untilTo = scope.run(() => useUntilTo(10))

    untilTo?.run(0, 1)

    expect(untilTo?.value.value).toBe(10)

    vi.advanceTimersByTime(100)

    expect(untilTo?.value.value).toBe(9)

    untilTo?.run(0, 2)

    vi.advanceTimersByTime(100)

    expect(untilTo?.value.value).toBe(7)

    vi.advanceTimersByTime(800)

    expect(untilTo?.value.value).toBe(0)

    untilTo?.stop()
    vi.useRealTimers()
  })
})
