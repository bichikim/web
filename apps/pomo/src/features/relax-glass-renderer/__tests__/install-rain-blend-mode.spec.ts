import {expect, it} from 'vitest'
import {installRainBlendMode} from '../install-rain-blend-mode'

const GL = {
  ONE: 1,
  ONE_MINUS_DST_COLOR: 775,
  ONE_MINUS_SRC_ALPHA: 771,
  ONE_MINUS_SRC_COLOR: 769,
} as const

it('should preserve unrelated blend modes and install the reference rain factors', () => {
  const normal = [1, 771]
  const blendModesMap = {exclusion: [1, 0], normal}
  installRainBlendMode({gl: GL, state: {blendModesMap}})
  expect(blendModesMap.exclusion).toEqual([775, 769, 1, 771])
  expect(blendModesMap.normal).toBe(normal)
})

it.each([undefined, null, [], {}, {blendModesMap: null}, {blendModesMap: []}, {blendModesMap: 1}])(
  'should reject an incompatible Pixi state %j',
  (state) => {
    expect(() => installRainBlendMode({gl: GL, state})).toThrow(
      'PixiJS WebGL blend-mode map is unavailable',
    )
  },
)

it('should reject a blend map that cannot accept the required mode', () => {
  const blendModesMap = Object.freeze({normal: [1, 771]})
  expect(() => installRainBlendMode({gl: GL, state: {blendModesMap}})).toThrow()
})
