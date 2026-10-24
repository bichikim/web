import {expect, test} from 'vitest'
import {convertCubismLayout} from '../convert-cubism-layout'
import {createDemoDocument} from '../../player/create-demo-document'
import {fitDocument} from '../../player/internal/layout-player-root'

test.each([
  [{height: 1}, 0.5, 0, 0],
  [{width: 1}, 1, 0, 0],
  [{center_x: 0.5, height: 1}, 0.5, 0.25, 0],
  [{center_y: 0, height: 1}, 0.5, 0, -0.5],
  [{bottom: -1, height: 1, right: 1}, 0.5, 0.5, -2],
  [{height: 1, left: -0.2, top: 0.3}, 0.5, -0.2, 0.3],
] as const)('should preserve SDK scale and position for %j', (source, scale, x, y) => {
  const viewport = {height: 200, width: 100}
  const layout = convertCubismLayout(source, viewport)
  const document = {...createDemoDocument(), layout, viewport}
  for (const screen of [
    {height: 400, width: 400},
    {height: 600, width: 200},
  ]) {
    const reference = fitDocument({document: {...document, layout: undefined}, screen})
    const fit = fitDocument({document, screen})
    expect(fit.scale).toBeCloseTo(reference.scale * scale)
    expect(50 * fit.scale + fit.offset.x - (50 * reference.scale + reference.offset.x)).toBeCloseTo(
      x * 100 * reference.scale,
    )
    expect(
      100 * fit.scale + fit.offset.y - (100 * reference.scale + reference.offset.y),
    ).toBeCloseTo(-y * 100 * reference.scale)
  }
})

test('should reject non-positive or non-finite sizes', () => {
  expect(() => convertCubismLayout({width: 0}, {height: 100, width: 100})).toThrow('positive')
  expect(() => convertCubismLayout({height: Infinity}, {height: 100, width: 100})).toThrow()
})
