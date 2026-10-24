import {type MessageConnection, ResponseError} from 'vscode-jsonrpc/node.js'
import {expect, it, vi} from 'vitest'
import {requestSymbols} from '../request-symbols'
import type {SymbolLookup} from '../../types'

const targets = [
  {
    range: {end: {character: 12, line: 0}, start: {character: 7, line: 0}},
    uri: 'file:///workspace/helper.rs',
  },
]
const fixture = () => {
  const sendRequest = vi.fn().mockResolvedValue(targets)
  const onProgress = vi.fn(
    (_type: unknown, _token: string, _receive: (value: unknown) => void) => ({dispose: vi.fn()}),
  )
  const connection = {onProgress, sendRequest} as unknown as MessageConnection
  return {
    onProgress,
    query: (request: SymbolLookup = {kind: 'definition'}) =>
      requestSymbols({
        connection,
        failed: 'rust-analysis-failed',
        offset: 0,
        request,
        source: 'greet()',
        uri: 'file:///workspace/main.rs',
      }),
    sendRequest,
  }
}

it('should repeat an invalidated symbol request once against the current documents', async () => {
  const {query, sendRequest} = fixture()
  sendRequest.mockRejectedValueOnce(new ResponseError(-32801, 'content modified'))
  expect(await query()).toEqual({
    ok: true,
    value: [{column: 8, line: 1, path: '/workspace/helper.rs'}],
  })
  expect(sendRequest).toHaveBeenCalledTimes(2)
  expect(sendRequest.mock.calls[1]).toEqual(sendRequest.mock.calls[0])
})

it.each([-32603, -32800])('should propagate response error %s without retrying', async (code) => {
  const {query, sendRequest} = fixture()
  const error = new ResponseError(code, 'request failed')
  sendRequest.mockRejectedValueOnce(error)
  await expect(query()).rejects.toBe(error)
  expect(sendRequest).toHaveBeenCalledOnce()
})

it('should propagate a second invalidation without repeating indefinitely', async () => {
  const {query, sendRequest} = fixture()
  const error = new ResponseError(-32801, 'content modified')
  sendRequest.mockRejectedValue(error)
  await expect(query()).rejects.toBe(error)
  expect(sendRequest).toHaveBeenCalledTimes(2)
})

it('should retain caller cancellation without repeating the request', async () => {
  const {query, sendRequest} = fixture()
  const controller = new AbortController()
  const pending = Promise.withResolvers<unknown>()
  sendRequest.mockReturnValueOnce(pending.promise)
  const result = query({kind: 'definition', signal: controller.signal})
  controller.abort()
  pending.reject(new ResponseError(-32801, 'content modified'))
  await expect(result).rejects.toMatchObject({name: 'AbortError'})
  expect(sendRequest).toHaveBeenCalledOnce()
})

it('should not repeat an invalidated request after delivering partial results', async () => {
  const {onProgress, query, sendRequest} = fixture()
  const error = new ResponseError(-32801, 'content modified')
  const receive = vi.fn()
  sendRequest.mockImplementationOnce(async () => {
    onProgress.mock.calls[0]?.[2](targets)
    throw error
  })
  await expect(query({kind: 'references', receive})).rejects.toBe(error)
  expect(receive).toHaveBeenCalledExactlyOnceWith([
    {column: 8, line: 1, path: '/workspace/helper.rs'},
  ])
  expect(sendRequest).toHaveBeenCalledOnce()
})
