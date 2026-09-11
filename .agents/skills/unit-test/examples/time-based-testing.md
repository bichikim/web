# Time-based Testing (Fake Timers)

Vitest controls `setTimeout`, `setInterval`, etc. with `vi.useFakeTimers()`.

## Lifecycle

Enable fake timers before each test and restore real timers afterward. Advance time explicitly and assert behavior before and after the relevant delay.

## Main APIs

| API                             | Purpose                           |
| ------------------------------- | --------------------------------- |
| `vi.useFakeTimers()`            | Switch to fake timers             |
| `vi.useRealTimers()`            | Restore to real timers            |
| `vi.advanceTimersByTime(ms)`    | Advance time by ms                |
| `vi.advanceTimersToNextTimer()` | Advance to next timer             |
| `vi.runAllTimers()`             | Run all pending timers            |
| `vi.runOnlyPendingTimers()`     | Run only currently pending timers |
