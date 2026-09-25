import {describe, expect, test} from 'vitest'

import modelSource from '../../../../examples/development-model.json?raw'
import {composeParameterScene, composeParameterVertices} from '../../../deformation'
import {parseDocument} from '../../parse-document'
import {applySceneDeformers} from '../scene-deformation'
import geometry from './fixtures/yaw-geometry.json'

const parsed = parseDocument(modelSource)
if (!parsed.ok) {
  throw new Error('Invalid development model')
}
const model = parsed.document

describe('development model full-body yaw limit', () => {
  // Preserve authored yaw poses, including directional arm volume, when clamping out-of-range input.
  test.each(
    geometry.flatMap((pose) =>
      Math.abs(pose.values['full-body-x']) === 22
        ? [
            pose,
            {
              ...pose,
              values: {...pose.values, 'full-body-x': Math.sign(pose.values['full-body-x']) * 30},
            },
          ]
        : [pose],
    ),
  )('should retain authored geometry and clamp the limit at $values', ({parts, values}) => {
    const verticesByPartId = new Map(
      parts.map(({partId}) => {
        const part = model.parts.find((candidate) => candidate.id === partId)!
        return [
          partId,
          [
            ...composeParameterVertices({
              document: model,
              parameterValues: values,
              partId,
              restVertices: part.mesh.vertices,
            }),
          ],
        ]
      }),
    )
    applySceneDeformers({
      document: {...model, scene: composeParameterScene(model, values)},
      verticesByPartId,
    })
    for (const {coordinates, partId} of parts) {
      const vertices = verticesByPartId.get(partId)!
      const actual = [...vertices.slice(0, 2), ...vertices.slice(-2)]
      coordinates.forEach((expected, index) => {
        expect(actual[index], `${partId}: coordinate ${index}`).toBeCloseTo(expected, 6)
      })
    }
  })
})
