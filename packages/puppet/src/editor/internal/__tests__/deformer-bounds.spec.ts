import {expect, test} from 'vitest'
import {createDemoDocument} from '../../../player'
import {getDeformerBounds} from '../deformer-bounds'
import {createDenseMesh} from './fixtures/dense-mesh'

test.each([3, 150_000])('should bound selected meshes with %i vertices', (count) => {
  const source = createDemoDocument()
  const part = source.parts[0]!
  const document = {
    ...source,
    motions: [],
    parameterBindings: [],
    parts: source.parts.map((candidate) =>
      candidate.id === part.id ? {...part, mesh: createDenseMesh(count)} : candidate,
    ),
  }
  expect(getDeformerBounds(document, [part.id])).toEqual({
    height: 1,
    width: count - 1,
    x: 0,
    y: 0,
  })
  expect(getDeformerBounds(document, [])).toBeUndefined()
})
