/** @vitest-environment node */
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {loadAsset} from '../assets'

const PATH = 'onnx/sa3-sm-sfx/dit_fp16.onnx'
const BYTES = new Uint8Array([1, 2, 3])
const cache = {match: vi.fn(), put: vi.fn()}
const fetcher = vi.fn()

beforeEach(() => {
  cache.match.mockResolvedValue(undefined)
  cache.put.mockResolvedValue(undefined)
  fetcher.mockResolvedValue(new Response(BYTES, {headers: {'content-length': '3'}}))
  vi.stubGlobal('fetch', fetcher)
  vi.stubGlobal('caches', {open: vi.fn().mockResolvedValue(cache)})
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.resetAllMocks()
})

it('should return cached model bytes without downloading', async () => {
  cache.match.mockResolvedValue(new Response(BYTES))
  expect(await loadAsset(PATH, vi.fn())).toEqual(BYTES)
  expect(fetcher).not.toHaveBeenCalled()
  expect(cache.put).not.toHaveBeenCalled()
})

it('should download pinned bytes, report progress, and cache a readable copy', async () => {
  const progress = vi.fn()
  expect(await loadAsset(PATH, progress)).toEqual(BYTES)
  const url = fetcher.mock.calls[0][0]
  expect(url).toContain('/resolve/da6edc54ddba10bfd79a077102ded687f80e882b/')
  expect(url).toContain(PATH)
  expect(progress).toHaveBeenCalledWith('환경음 생성 모델 다운로드 중 · 100%')
  expect(cache.put).toHaveBeenCalledWith(url, expect.any(Response))
  const stored = cache.put.mock.calls[0][1] as Response
  expect(new Uint8Array(await stored.arrayBuffer())).toEqual(BYTES)
})

it.each(['open', 'match', 'unavailable', 'read'])(
  'should return downloaded bytes when cache access fails at %s',
  async (failure) => {
    const denied = new Error('storage denied')
    switch (failure) {
      case 'open':
        vi.stubGlobal('caches', {open: vi.fn().mockRejectedValue(denied)})
        break
      case 'match':
        cache.match.mockRejectedValue(denied)
        break
      case 'unavailable':
        vi.stubGlobal('caches', undefined)
        break
      case 'read':
        cache.match.mockResolvedValue({arrayBuffer: vi.fn().mockRejectedValue(denied)})
        break
    }
    const progress = vi.fn()
    expect(await loadAsset(PATH, progress)).toEqual(BYTES)
    expect(fetcher).toHaveBeenCalledOnce()
    expect(cache.put).not.toHaveBeenCalled()
    expect(progress).toHaveBeenCalledWith(
      '모델 저장소를 사용할 수 없어 이번에는 모델을 임시로 사용합니다.',
    )
  },
)

it('should return usable bytes when the cache write quota is exhausted', async () => {
  cache.put.mockRejectedValue(new Error('quota exceeded'))
  const progress = vi.fn()
  expect(await loadAsset(PATH, progress)).toEqual(BYTES)
  expect(progress).toHaveBeenCalledWith('저장 공간이 부족해 이번에는 모델을 임시로 사용합니다.')
})

it('should reject HTTP failures without caching the response', async () => {
  fetcher.mockResolvedValue(new Response('unavailable', {status: 503}))
  await expect(loadAsset(PATH, vi.fn())).rejects.toThrow('모델 다운로드 실패 (503)')
  expect(cache.put).not.toHaveBeenCalled()
})

it('should preserve a download error without caching partial bytes', async () => {
  fetcher.mockRejectedValue(new Error('offline'))
  await expect(loadAsset(PATH, vi.fn())).rejects.toThrow('offline')
  expect(cache.put).not.toHaveBeenCalled()
})
