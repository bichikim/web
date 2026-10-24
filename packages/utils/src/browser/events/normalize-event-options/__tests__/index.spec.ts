import {normalizeEventOptions} from '../'
import {supportsPassiveEvents} from 'src/browser/events/supports-passive-events'
import {describe, expect, it, vi} from 'vitest'

vi.mock('src/browser/events/supports-passive-events')

const mockSupportsPassiveEvents = vi.mocked(supportsPassiveEvents)

describe('normalizeEventOptions', () => {
  it('should create event options with supporting passive', () => {
    mockSupportsPassiveEvents.mockReturnValueOnce(true)

    expect(normalizeEventOptions({capture: true, passive: true})).toEqual({
      capture: true,
      passive: true,
    })
  })

  it('should create event options without supporting passive', () => {
    mockSupportsPassiveEvents.mockReturnValueOnce(false)

    expect(normalizeEventOptions({capture: true, passive: true})).toBe(true)
  })

  it('should preserve capture=false for legacy browsers', () => {
    mockSupportsPassiveEvents.mockReturnValueOnce(false)

    expect(normalizeEventOptions({capture: false, passive: true})).toBe(false)
  })
})
