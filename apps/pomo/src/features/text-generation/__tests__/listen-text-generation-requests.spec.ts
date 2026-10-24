import {expect, it, vi} from 'vitest'
import {listenTextGenerationRequests} from '..'

it('should preserve request identity and the worker error protocol on rejection', async () => {
  const request = {requestId: 'tarot-1'}
  const scope = {
    addEventListener:
      vi.fn<(type: 'message', listener: (event: MessageEvent<typeof request>) => void) => void>(),
  }
  const onError = vi.fn()
  listenTextGenerationRequests<typeof request>({
    fallback: 'fallback',
    handle: async () => {
      throw new Error('failed')
    },
    onError,
    onSkipped: vi.fn(),
    scope,
  })
  scope.addEventListener.mock.calls[0]![1](new MessageEvent('message', {data: request}))
  await Promise.resolve()
  expect(onError).toHaveBeenCalledExactlyOnceWith(
    {message: 'failed', restartRequired: false, type: 'error'},
    request,
  )
})
it('should use fallback for unknown failures and leave successful requests alone', async () => {
  const scope = {
    addEventListener:
      vi.fn<(type: 'message', listener: (event: MessageEvent<string>) => void) => void>(),
  }
  const onError = vi.fn()
  const handle = vi.fn().mockResolvedValueOnce(undefined).mockRejectedValueOnce(null)
  listenTextGenerationRequests<string>({
    fallback: 'fallback',
    handle,
    onError,
    onSkipped: vi.fn(),
    scope,
  })
  scope.addEventListener.mock.calls[0]![1](new MessageEvent('message', {data: 'first'}))
  await Promise.resolve()
  expect(onError).not.toHaveBeenCalled()
  scope.addEventListener.mock.calls[0]![1](new MessageEvent('message', {data: 'second'}))
  await Promise.resolve()
  expect(onError).toHaveBeenCalledExactlyOnceWith(
    {message: 'fallback', restartRequired: false, type: 'error'},
    'second',
  )
})

it('should forward a skipped request without reporting an error', async () => {
  const request = {requestId: 'second'}
  const scope = {
    addEventListener:
      vi.fn<(type: 'message', listener: (event: MessageEvent<typeof request>) => void) => void>(),
  }
  const onSkipped = vi.fn()
  const onError = vi.fn()
  listenTextGenerationRequests({
    fallback: 'fallback',
    handle: async () => ({reason: 'busy' as const, status: 'skipped' as const}),
    onError,
    onSkipped,
    scope,
  })
  scope.addEventListener.mock.calls[0]![1](new MessageEvent('message', {data: request}))
  await Promise.resolve()
  expect(onSkipped).toHaveBeenCalledExactlyOnceWith(request)
  expect(onError).not.toHaveBeenCalled()
})
