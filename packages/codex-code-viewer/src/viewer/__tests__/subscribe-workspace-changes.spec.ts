import {type CallToolResult, ErrorCode, McpError} from '@modelcontextprotocol/sdk/types.js'
import {describe, expect, it, vi} from 'vitest'
import type {ViewerPort} from '../types'
import {subscribeWorkspaceChanges} from '../subscribe-workspace-changes'

const response = (revision: number): CallToolResult => ({
  content: [],
  structuredContent: {revision},
})

describe('subscribeWorkspaceChanges', () => {
  it('should reconnect completed idle waits without refreshing files or overlapping calls', async () => {
    const resumed = Promise.withResolvers<void>()
    const call = vi
      .fn<ViewerPort['call']>()
      .mockResolvedValueOnce(response(7))
      .mockResolvedValueOnce(response(7))
      .mockImplementationOnce(async (_name, _input, options) => {
        resumed.resolve()
        return new Promise((_resolve, reject) => {
          options?.signal?.addEventListener('abort', () => reject(options.signal?.reason), {
            once: true,
          })
        })
      })
    const receive = vi.fn()
    const report = vi.fn()
    const stop = await subscribeWorkspaceChanges({call, receive, report, session: 'first'})
    await resumed.promise
    expect(call).toHaveBeenCalledTimes(3)
    expect(call.mock.calls.map(([name]) => name)).toEqual([
      'code.watch',
      'code.watch.next',
      'code.watch.next',
    ])
    expect(receive).toHaveBeenCalledOnce()
    expect(report).not.toHaveBeenCalled()
    await stop()
  })

  it('should refresh on changes and abort the outstanding wait when released', async () => {
    const changed = Promise.withResolvers<CallToolResult>()
    const waiting = Promise.withResolvers<void>()
    const call = vi
      .fn<ViewerPort['call']>()
      .mockResolvedValueOnce(response(0))
      .mockReturnValueOnce(changed.promise)
      .mockImplementationOnce(async (_name, _input, options) => {
        waiting.resolve()
        return new Promise((_resolve, reject) => {
          options?.signal?.addEventListener('abort', () => reject(options.signal?.reason), {
            once: true,
          })
        })
      })
    const receive = vi.fn()
    const report = vi.fn()
    const stop = await subscribeWorkspaceChanges({call, receive, report, session: 'first'})
    expect(receive).toHaveBeenCalledOnce()
    changed.resolve(response(3))
    await waiting.promise
    expect(receive).toHaveBeenCalledTimes(2)
    expect(call).toHaveBeenLastCalledWith(
      'code.watch.next',
      {revision: 3, session: 'first'},
      expect.objectContaining({signal: expect.any(AbortSignal), timeout: 30_000}),
    )
    await stop()
    expect(report).not.toHaveBeenCalled()
  })

  it('should reconnect a protocol timeout without treating it as a file change', async () => {
    const waiting = Promise.withResolvers<void>()
    const call = vi
      .fn<ViewerPort['call']>()
      .mockResolvedValueOnce(response(4))
      .mockRejectedValueOnce(new McpError(ErrorCode.RequestTimeout, 'Request timed out'))
      .mockImplementationOnce(async (_name, _input, options) => {
        waiting.resolve()
        return new Promise((_resolve, reject) => {
          options?.signal?.addEventListener('abort', () => reject(options.signal?.reason), {
            once: true,
          })
        })
      })
    const receive = vi.fn()
    const report = vi.fn()
    const stop = await subscribeWorkspaceChanges({call, receive, report, session: 'first'})
    await waiting.promise
    expect(call).toHaveBeenCalledTimes(3)
    expect(receive).toHaveBeenCalledOnce()
    expect(report).not.toHaveBeenCalled()
    await stop()
  })

  it('should report a real wait failure and stop requesting changes', async () => {
    const failure = new Error('connection lost')
    const call = vi
      .fn<ViewerPort['call']>()
      .mockResolvedValueOnce(response(0))
      .mockRejectedValueOnce(failure)
    const reported = Promise.withResolvers<unknown>()
    const stop = await subscribeWorkspaceChanges({
      call,
      receive: vi.fn(),
      report: reported.resolve,
      session: 'first',
    })
    expect(await reported.promise).toBe(failure)
    expect(call).toHaveBeenCalledTimes(2)
    await stop()
  })

  it('should propagate an initial connection failure', async () => {
    const failure = new Error('session expired')
    const call = vi.fn<ViewerPort['call']>().mockRejectedValue(failure)
    await expect(
      subscribeWorkspaceChanges({call, receive: vi.fn(), report: vi.fn(), session: 'first'}),
    ).rejects.toBe(failure)
    expect(call).toHaveBeenCalledOnce()
  })
})
