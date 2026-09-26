import {describe, expect, test} from 'vitest'

import {createDemoDocument} from '../create-demo-document'
import {parseDocument} from '../parse-document'
import {convertSceneContainers} from '../../editor/internal/container-conversion'

describe('parseDocument spatial surface', () => {
  const source = createDemoDocument()
  const part = source.parts[0]!
  const controlPoints = part.mesh.vertices.flatMap((coordinate, index) =>
    index % 2 === 0 ? [coordinate, part.mesh.vertices[index + 1]!, 0] : [],
  )
  const spatial = {controlPoints, origin: [0, 0, 0], rotationParameterIds: [null, 'angle-x', null]}
  const document = {...source, parts: [{...part, spatial}, ...source.parts.slice(1)]}

  test('should accept a textured 3D surface with matching mesh vertices', () => {
    expect(parseDocument(JSON.stringify(document))).toMatchObject({ok: true})
  })

  test('should reject malformed spatial coordinates and missing parameters', () => {
    for (const invalid of [
      {...spatial, controlPoints: [0, 0]},
      {...spatial, origin: [0, 0]},
      {...spatial, rotationParameterIds: [null, 'missing', null]},
    ]) {
      expect(
        parseDocument(
          JSON.stringify({
            ...document,
            parts: [{...part, spatial: invalid}, ...source.parts.slice(1)],
          }),
        ),
      ).toMatchObject({ok: false})
    }
  })

  test('should accept optional movement and scale on old 3D documents but reject a zero scale', () => {
    const converted = convertSceneContainers({
      document: source,
      nodeIds: ['shapes'],
      targetKind: 'spatial',
    })!
    const node = converted.scene!.roots.find((candidate) => candidate.id === 'shapes')!
    const legacy = {
      ...converted,
      scene: {
        roots: converted.scene!.roots.map((candidate) =>
          candidate.id === 'shapes' && candidate.kind === 'deformer'
            ? {...candidate, spatialScale: undefined, spatialTranslation: undefined}
            : candidate,
        ),
      },
    }
    const invalid = {
      ...converted,
      scene: {
        roots: converted.scene!.roots.map((candidate) =>
          candidate.id === node.id && candidate.kind === 'deformer'
            ? {...candidate, spatialScale: [0, 1, 1]}
            : candidate,
        ),
      },
    }

    expect(parseDocument(JSON.stringify(legacy)).ok).toBe(true)
    expect(parseDocument(JSON.stringify(converted)).ok).toBe(true)
    expect(parseDocument(JSON.stringify(invalid)).ok).toBe(false)
  })
})
