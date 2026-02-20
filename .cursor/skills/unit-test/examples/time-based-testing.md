# Time-based Testing (Fake Timers)

Vitest controls `setTimeout`, `setInterval`, etc. with `vi.useFakeTimers()`.

## Basic pattern

```ts
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

describe('delayedAction', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers() // or vi.restoreAllMocks()
  })

  it('should call callback after delay', () => {
    const callback = vi.fn()
    setTimeout(callback, 1000)

    expect(callback).not.toHaveBeenCalled()

    vi.advanceTimersByTime(500)
    expect(callback).not.toHaveBeenCalled()

    vi.advanceTimersByTime(500)
    expect(callback).toHaveBeenCalledTimes(1)
  })
})
```

## Main APIs

| API | Purpose |
| --- | --- |
| `vi.useFakeTimers()` | Switch to fake timers |
| `vi.useRealTimers()` | Restore to real timers |
| `vi.advanceTimersByTime(ms)` | Advance time by ms |
| `vi.advanceTimersToNextTimer()` | Advance to next timer |
| `vi.runAllTimers()` | Run all pending timers |
| `vi.runOnlyPendingTimers()` | Run only currently pending timers |
