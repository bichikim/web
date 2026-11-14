import {expect, test} from 'vitest'
import {createDemoDocument} from '../../../player'
import {createSpatialSurface} from '../create-spatial-surface'
import {createDenseMesh} from './fixtures/dense-mesh'

test.each([3, 150_000])('should center a spatial surface with %i vertices', (count) => {
  const part = createDemoDocument().parts[0]!
  const surface = createSpatialSurface({...part, mesh: createDenseMesh(count)})
  expect(surface.origin).toEqual([(count - 1) / 2, 0.5, 0])
  expect(surface.controlPoints).toHaveLength(count * 3)
  expect(surface.controlPoints.slice(-3)).toEqual([count - 1, (count - 1) % 2, 0])
})
