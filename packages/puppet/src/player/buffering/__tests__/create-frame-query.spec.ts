import {expect, test} from 'vitest'
import {createEmptyDocument} from '../../create-empty-document'
import {createFrameQuery} from '../create-frame-query'
import {createState} from './fixtures/runtime-state'
test('should retain displayed geometry and query values while input or renderer buffers change', () => {
  const vertices = new Float32Array([0, 0, 1, 0, 0, 1])
  const document = {
    ...createEmptyDocument(),
    hitAreas: [{id: 'face', name: 'Face', partIds: ['part']}],
    parts: [
      {
        id: 'part',
        mesh: {indices: [0, 1, 2], uvs: [0, 0, 1, 0, 0, 1], vertices: [...vertices]},
        texture: {height: 1, src: '', width: 1},
      },
    ],
  }
  const query = createFrameQuery({
    getPaintOrder: () => ['part'],
    getPartVertices: () => vertices,
    toDocumentPoint: (point) => point,
  })
  const state = {...createState(), frameValues: {p: 0.25}}
  query.update(document, state, 'smile')
  vertices.fill(10)
  const values = query.getParameterValues()
  Reflect.set(values, 'p', 5)
  expect(query.getParameterValue('p')).toBe(0.25)
  expect(query.getExpression()).toBe('smile')
  expect(query.hitTest({x: 0.2, y: 0.2})).toBe('face')
  query.update(document, {...state, frameValues: {p: 0.5}}, undefined)
  expect(query.hitTest({x: 0.2, y: 0.2})).toBeUndefined()
  expect(query.getParameterValue('p')).toBe(0.5)
})
