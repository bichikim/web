import {expect, test} from 'vitest'
import {getColorContrast} from '../get-color-contrast'

test.each([
  ['#000000', '#ffffff', 21],
  ['#ffffff', '#ffffff', 1],
  ['#777777', '#ffffff', 4.48],
])('should measure contrast for %s on %s', (foreground, background, ratio) => {
  expect(getColorContrast(foreground, background)).toBeCloseTo(ratio, 1)
  expect(getColorContrast(background, foreground)).toBeCloseTo(ratio, 1)
})
