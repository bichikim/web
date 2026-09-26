/** @vitest-environment node */
import {afterEach, describe, expect, it, vi} from 'vitest'
import {getMonotonicTime} from '../index'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('getMonotonicTime', () => {
  it.each([-60_000, 60_000])(
    'should advance independently of a %i ms wall-clock change',
    (adjustment) => {
      const NativeEvent = Event
      let timestamp = 0

      class TimestampedEvent extends NativeEvent {
        constructor(type: string) {
          super(type)
          timestamp += 10
          Object.defineProperty(this, 'timeStamp', {value: timestamp})
        }
      }

      vi.stubGlobal('Event', TimestampedEvent)

      const startedAt = getMonotonicTime()
      const wallTime = Date.now()
      vi.spyOn(Date, 'now').mockReturnValue(wallTime + adjustment)
      const elapsed = getMonotonicTime() - startedAt

      expect(elapsed).toBe(10)
    },
  )
})
