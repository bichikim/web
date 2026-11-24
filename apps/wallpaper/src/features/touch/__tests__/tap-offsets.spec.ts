import {afterEach, expect, it, vi} from 'vitest'
import {DEFAULT_POFFO_TOUCH} from '@winter-love/wallpaper/settings/touch'
import {tapOffsets} from '../tap-offsets'

afterEach(() => vi.restoreAllMocks())
it('should choose an available direction at parameter limits and bound amplified taps', () => {
  vi.spyOn(Math, 'random').mockReturnValue(0.25)
  const parameters = ['minimum', 'middle', 'maximum'].map((id) => ({
    axis: 'x' as const,
    defaultValue: 0,
    dimensions: 1,
    id,
    maximum: 1,
    minimum: 0,
    parts: ['part'],
  }))
  const offsets = tapOffsets({
    parameters,
    settings: {...DEFAULT_POFFO_TOUCH, amount: 0.5, parameters: {middle: {gain: 5}}},
    values: {maximum: 1, middle: 0.5, minimum: 0},
  })
  expect(offsets).toEqual({maximum: -0.5, middle: -0.5, minimum: 0.5})
})
