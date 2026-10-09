import {afterEach, describe, expect, it, vi} from 'vitest'
import {subscribeWorkspace} from '../subscribe-workspace'

describe('subscribeWorkspace', () => {
  afterEach(() => vi.unstubAllGlobals())
  it('should reject non-loopback event endpoints before connecting', async () => {
    const events = vi.fn()
    vi.stubGlobal('EventSource', events)
    const call = vi
      .fn()
      .mockResolvedValue({content: [], structuredContent: {url: 'https://example.com/events'}})
    await expect(subscribeWorkspace({call, receive: vi.fn(), session: 'first'})).rejects.toThrow()
    expect(events).not.toHaveBeenCalled()
  })
  it('should propagate tool failures without opening an event stream', async () => {
    const events = vi.fn()
    vi.stubGlobal('EventSource', events)
    const call = vi
      .fn()
      .mockResolvedValue({content: [], isError: true, structuredContent: {code: 'session-expired'}})
    await expect(subscribeWorkspace({call, receive: vi.fn(), session: 'expired'})).rejects.toThrow()
    expect(events).not.toHaveBeenCalled()
  })
})
