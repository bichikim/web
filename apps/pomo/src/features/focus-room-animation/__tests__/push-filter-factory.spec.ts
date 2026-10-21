import type {Texture} from 'pixi.js'
import {afterEach, expect, it, vi} from 'vitest'
import {PixelPushFilter} from '../pixel-push-filter'
import {MaskedPixelPushFilter} from '../masked-pixel-push-filter'
import {createPushFilters} from '../push-filter-factory'

vi.mock('../pixel-push-filter', () => ({PixelPushFilter: vi.fn()}))
vi.mock('../masked-pixel-push-filter', () => ({MaskedPixelPushFilter: vi.fn()}))

afterEach(() => {
  vi.resetAllMocks()
})

it('should finish partial filter cleanup without replacing the original creation failure', () => {
  const failure = new Error('filter construction failed')
  const cleanup = new Error('first cleanup failed')
  const first = {
    destroy: vi.fn(() => {
      throw cleanup
    }),
  }
  const second = {destroy: vi.fn()}
  vi.mocked(PixelPushFilter)
    .mockImplementationOnce(function FirstPixelPushFilter() {
      return first as never
    })
    .mockImplementationOnce(function SecondPixelPushFilter() {
      return second as never
    })
  vi.mocked(MaskedPixelPushFilter).mockImplementationOnce(function FailedMaskedPixelPushFilter() {
    throw failure
  })
  const texture = {height: 100, width: 200} as Texture
  const effect = {
    distance: {x: 1, y: 1},
    featherPixels: 1,
    kind: 'pixel-push',
    region: {height: 1, width: 1, x: 0, y: 0},
  } as const
  const masked = {
    distance: {x: 1, y: 1},
    kind: 'masked-pixel-push',
    maskSource: '/mask.png',
  } as const
  const diagnostic = vi.spyOn(console, 'error').mockImplementation(() => undefined)

  try {
    expect(() =>
      createPushFilters([effect, effect, masked], new Map([['/mask.png', texture]]), texture),
    ).toThrow(failure)
    expect(first.destroy).toHaveBeenCalledOnce()
    expect(second.destroy).toHaveBeenCalledOnce()
    expect(diagnostic).toHaveBeenCalledWith(expect.any(String), cleanup)
  } finally {
    diagnostic.mockRestore()
  }
})
