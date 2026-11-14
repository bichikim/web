import {expect, test} from 'vitest'
import {createDemoDocument} from '../../../player'
import {setParameterKeyformVertex} from '../parameter-part-keyforms'

const document = () => {
  const source = createDemoDocument()
  const vertices = [0, 0, 100, 0, 0, 100]
  return {
    ...source,
    motions: [],
    parameterBindings: [
      {
        id: 'binding',
        keyforms: [{parts: [{partId: source.parts[0]!.id, vertices}], values: [0] as const}],
        parameterIds: ['angle-x'] as const,
        targetPartIds: [source.parts[0]!.id],
      },
    ],
    parts: [{...source.parts[0]!, mesh: {indices: [0, 1, 2], uvs: [0, 0, 1, 0, 0, 1], vertices}}],
    scene: undefined,
  }
}

test('should reject a keyform vertex move that reverses triangle winding', () => {
  const source = document()
  expect(
    setParameterKeyformVertex({
      bindingId: 'binding',
      document: source,
      partId: source.parts[0]!.id,
      values: [0],
      vertexIndex: 0,
      x: 100,
      y: 100,
    }),
  ).toBeUndefined()
  expect(source.parameterBindings[0]!.keyforms[0]!.parts[0]!.vertices).toEqual([
    0, 0, 100, 0, 0, 100,
  ])
})

test('should store a valid keyform vertex move without changing the rest mesh', () => {
  const source = document()
  const updated = setParameterKeyformVertex({
    bindingId: 'binding',
    document: source,
    partId: source.parts[0]!.id,
    values: [0],
    vertexIndex: 0,
    x: 10,
    y: 10,
  })!
  expect(updated.parameterBindings![0]!.keyforms[0]!.parts[0]!.vertices).toEqual([
    10, 10, 100, 0, 0, 100,
  ])
  expect(updated.parts).toBe(source.parts)
})
