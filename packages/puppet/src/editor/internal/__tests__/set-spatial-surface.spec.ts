import {describe, expect, test} from 'vitest'

import {createDemoDocument} from '../../../player'
import {createSpatialSurface, setSpatialSurface} from '../set-spatial-surface'

describe('setSpatialSurface', () => {
  test('should attach rest-aligned XYZ points and remove them without changing the image mesh', () => {
    const document = createDemoDocument()
    const part = document.parts[0]!
    const surface = createSpatialSurface(part)
    const updated = setSpatialSurface({document, partId: part.id, surface})

    expect(surface.controlPoints).toHaveLength((part.mesh.vertices.length / 2) * 3)
    expect(updated?.parts[0]?.spatial).toEqual(surface)
    expect(updated?.parts[0]?.mesh).toBe(part.mesh)
    expect(
      setSpatialSurface({document: updated!, partId: part.id, surface: null})?.parts[0]?.spatial,
    ).toBeUndefined()
  })
})
