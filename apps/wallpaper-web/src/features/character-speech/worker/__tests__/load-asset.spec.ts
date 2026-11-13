import {expect, test, vi} from 'vitest'
import {loadSpeechAsset} from '../load-asset'

const parse = async (response: Response) => {
  const text = await response.text()
  if (text !== 'valid') {
    throw new Error('Invalid model')
  }
  return text
}
const url = 'https://example.test/model'
const setup = (cached: Response | undefined) => {
  const cache = {
    delete: vi.fn().mockResolvedValue(true),
    match: vi.fn().mockResolvedValue(cached),
    put: vi.fn().mockResolvedValue(undefined),
  }
  const fetcher = vi.fn().mockResolvedValue(new Response('valid'))
  const resources = {fetch: fetcher, openCache: vi.fn().mockResolvedValue(cache)}
  return {cache, fetcher, resources}
}

test('should replace an invalid stored model with a validated download', async () => {
  const {cache, fetcher, resources} = setup(new Response('broken'))
  expect(await loadSpeechAsset({...resources, parse, url})).toBe('valid')
  expect(cache.delete).toHaveBeenCalledWith(url)
  expect(fetcher).toHaveBeenCalledOnce()
  expect(await cache.put.mock.calls[0]![1].text()).toBe('valid')
})

test('should reuse a validated model without downloading', async () => {
  const {fetcher, resources} = setup(new Response('valid'))
  expect(await loadSpeechAsset({...resources, parse, url})).toBe('valid')
  expect(fetcher).not.toHaveBeenCalled()
})

test('should never store an invalid download or retry it indefinitely', async () => {
  const {cache, fetcher, resources} = setup(undefined)
  fetcher.mockResolvedValue(new Response('broken'))
  await expect(loadSpeechAsset({...resources, parse, url})).rejects.toThrow('Invalid model')
  expect(cache.put).not.toHaveBeenCalled()
  expect(fetcher).toHaveBeenCalledOnce()
})

test('should still load valid assets when persistent cache access fails', async () => {
  const {fetcher, resources} = setup(undefined)
  resources.openCache.mockRejectedValue(new Error('Storage blocked'))
  expect(await loadSpeechAsset({...resources, parse, url})).toBe('valid')
  expect(fetcher).toHaveBeenCalledOnce()
})

test('should return the validated asset even when storing it fails', async () => {
  const {cache, resources} = setup(undefined)
  cache.put.mockRejectedValue(new Error('Quota exceeded'))
  expect(await loadSpeechAsset({...resources, parse, url})).toBe('valid')
})

test('should reject HTTP failures without persisting the response', async () => {
  const {cache, fetcher, resources} = setup(undefined)
  fetcher.mockResolvedValue(new Response('missing', {status: 404}))
  await expect(loadSpeechAsset({...resources, parse, url})).rejects.toThrow(
    'Speech model download failed (404)',
  )
  expect(cache.put).not.toHaveBeenCalled()
})
