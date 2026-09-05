import {describe, expect, test} from 'vitest'

import {createDemoDocument} from '../create-demo-document'

describe('createDemoDocument', () => {
  test('should use the preview mesh to clip the circle and diamond', () => {
    const document = createDemoDocument()
    const preview = document.parts.find((part) => part.id === 'mesh-preview')!

    expect(preview.properties).toBeUndefined()
    expect(decodeURIComponent(preview.texture.src)).not.toContain('<text')
    expect(document.parts.find((part) => part.id === 'shape-circle')?.properties).toEqual({
      clippingMaskIds: ['mesh-preview'],
    })
    expect(document.parts.find((part) => part.id === 'shape-diamond')?.properties).toEqual({
      clippingMaskIds: ['mesh-preview'],
    })
    const diamond = document.parts.find((part) => part.id === 'shape-diamond')!
    const horizontalVertices = diamond.mesh.vertices.filter((_, index) => index % 2 === 0)
    expect(Math.max(...horizontalVertices)).toBeGreaterThan(document.viewport.width)
  })
})
