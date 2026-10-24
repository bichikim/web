import {afterEach, describe, expect, it, vi} from 'vitest'
import {subscribeWorkspace} from '../subscribe-workspace'

describe('subscribeWorkspace', () => {
  it('should connect to a preview stream on its own origin and release the subscription', async () => {
    vi.stubGlobal('location', {origin: 'http://192.168.1.20:8000'})
    const close = vi.fn()
    const events = vi.fn(function events() {
      return {addEventListener: vi.fn(), close, removeEventListener: vi.fn()}
    })
    vi.stubGlobal('EventSource', events)
    const url = 'http://192.168.1.20:8000/preview-token/stream/event-token'
    const call = vi.fn().mockResolvedValue({content: [], structuredContent: {url}})
    const dispose = await subscribeWorkspace({call, receive: vi.fn(), session: 'first'})
    expect(events).toHaveBeenCalledWith(url)
    await dispose()
    expect(close).toHaveBeenCalledOnce()
  })
  it('should reject streams on another origin even when their hostname matches', async () => {
    vi.stubGlobal('location', {origin: 'http://192.168.1.20:8000'})
    const events = vi.fn()
    vi.stubGlobal('EventSource', events)
    const call = vi
      .fn()
      .mockResolvedValue({content: [], structuredContent: {url: 'http://192.168.1.20:9000/events'}})
    await expect(subscribeWorkspace({call, receive: vi.fn(), session: 'first'})).rejects.toThrow()
    expect(events).not.toHaveBeenCalled()
  })
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
