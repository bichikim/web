import {afterEach, describe, expect, it, vi} from 'vitest'
import type {OpenAIExtensions} from '@openai/mcp-extensions/app'
import {subscribeWorkspace} from '../subscribe-workspace'

describe('subscribeWorkspace', () => {
  it('should refresh only for its subscribed MCP resource and remove the listener on cleanup', async () => {
    const remove = vi.fn()
    const resources = {
      addUpdateHandler: vi.fn<NonNullable<OpenAIExtensions['resources']>['addUpdateHandler']>(
        () => remove,
      ),
      subscribe: vi.fn().mockResolvedValue({}),
      unsubscribe: vi.fn().mockResolvedValue({}),
    }
    const resourceUri = 'code-viewer://workspace/first'
    const call = vi.fn().mockResolvedValue({content: [], structuredContent: {resourceUri}})
    const receive = vi.fn()
    const dispose = await subscribeWorkspace({call, receive, resources, session: 'first'})
    const handler = resources.addUpdateHandler.mock.calls[0]?.[0]
    expect(handler).toEqual(expect.any(Function))
    handler?.({
      method: 'notifications/resources/updated',
      params: {uri: 'code-viewer://workspace/other'},
    })
    expect(receive).toHaveBeenCalledOnce()
    handler?.({method: 'notifications/resources/updated', params: {uri: resourceUri}})
    expect(receive).toHaveBeenCalledTimes(2)
    await dispose()
    expect(remove).toHaveBeenCalledOnce()
    expect(resources.unsubscribe).toHaveBeenCalledWith({uri: resourceUri})
  })
  it('should remove its MCP listener when subscription fails', async () => {
    const remove = vi.fn()
    const resources = {
      addUpdateHandler: vi.fn<NonNullable<OpenAIExtensions['resources']>['addUpdateHandler']>(
        () => remove,
      ),
      subscribe: vi.fn().mockRejectedValue(new Error('subscription failed')),
      unsubscribe: vi.fn(),
    }
    const call = vi.fn().mockResolvedValue({
      content: [],
      structuredContent: {resourceUri: 'code-viewer://workspace/first'},
    })
    await expect(
      subscribeWorkspace({call, receive: vi.fn(), resources, session: 'first'}),
    ).rejects.toThrow('subscription failed')
    expect(remove).toHaveBeenCalledOnce()
  })
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
