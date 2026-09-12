import {describe, expect, it} from 'vitest'
import {validateMesh} from '../../mesh'
import {createDemoDocument} from '../../player/create-demo-document'
import {splitPartTriangle} from '../edit-document'

const PART_ID = 'mesh-preview'

describe('splitPartTriangle', () => {
  it('should split the containing triangle and append matching UV coordinates', () => {
    const document = createDemoDocument()
    const result = splitPartTriangle({document, partId: PART_ID, x: 320, y: 80})

    expect(result.ok).toBe(true)

    if (result.ok) {
      const mesh = result.document.parts[0]!.mesh
      expect(result.vertexIndex).toBe(5)
      expect(mesh.vertices.slice(-2)).toEqual([320, 80])
      expect(mesh.uvs.slice(-2)).toEqual([0.5, 1 / 6])
      expect(mesh.indices).toHaveLength(document.parts[0]!.mesh.indices.length + 6)
    }
  })
})
