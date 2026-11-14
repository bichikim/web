import {describe, expect, it, vi} from 'vitest'
import type {MessageConnection} from 'vscode-jsonrpc/node.js'
import {requestNativeMessage} from '../request-native-message'

describe('requestNativeMessage', () => {
  it('should finish cancellation without waiting for the analyzer to acknowledge it', async () => {
    const response = Promise.withResolvers<unknown>()
    const sendRequest = vi.fn(() => response.promise) satisfies Pick<
      MessageConnection,
      'sendRequest'
    >['sendRequest']
    const controller = new AbortController()
    const reason = new Error('Lookup superseded')
    const request = requestNativeMessage(
      {sendRequest},
      'textDocument/definition',
      {},
      controller.signal,
    )
    const rejected = expect(request).rejects.toBe(reason)
    controller.abort(reason)
    try {
      await rejected
    } finally {
      response.resolve([])
    }
  }, 100)
})
