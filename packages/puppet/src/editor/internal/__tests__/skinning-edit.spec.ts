import {expect, test} from 'vitest'
import {createSkinDocument} from '../../../deformation/__tests__/fixtures/skin'
import {findNode} from '../scene-tree'
import {createSkinStroke, inspectSkinTriangles, replaceSkinWeights} from '../skinning-edit'

const skin = () => {
  const document = createSkinDocument()
  const node = findNode(document.scene.roots, document.parts[0]!.id)
  if (node?.kind !== 'part' || node.skinning === undefined) {
    throw new Error('Missing skin')
  }
  return {
    ...node.skinning,
    influences: node.skinning.influences.map((influence, index) => ({
      ...influence,
      weights: index === 0 ? [0, 0.5, 1] : [1, 0.5, 0],
    })),
  }
}

test('should diagnose reversed, collapsed and stretched triangles in either winding', () => {
  const rest = [0, 0, 10, 0, 0, 10]
  expect(inspectSkinTriangles(rest, rest, [0, 1, 2])[0]?.flipped).toBe(false)
  expect(inspectSkinTriangles(rest, [0, 0, -10, 0, 0, 10], [0, 1, 2])[0]?.flipped).toBe(true)
  expect(inspectSkinTriangles(rest, [0, 0, 30, 0, 0, 10], [0, 2, 1])[0]?.stretched).toBe(true)
  expect(inspectSkinTriangles(rest, [0, 0, 0, 0, 0, 10], [0, 1, 2])[0]?.flipped).toBe(true)
})

test('should replace multiple weights exactly and normalize the other rotations', () => {
  const result = replaceSkinWeights(
    skin(),
    0,
    new Map([
      [0, 0.8],
      [2, 0.3],
    ]),
  )
  expect(result.influences[0]!.weights).toEqual([0.8, 0.5, 0.3])
  expect(result.influences[1]!.weights[0]).toBeCloseTo(0.2)
  expect(result.influences[1]!.weights[2]).toBeCloseTo(0.7)
})

test('should paint across a fast stroke only once per vertex and preserve protected endpoints', () => {
  const stroke = createSkinStroke({
    binding: skin(),
    indices: [0, 1, 2],
    target: 0,
    radius: 5,
    vertices: [0, 0, 10, 0, 20, 0],
    mode: 'add',
    protect: true,
    strength: 0.5,
  })
  stroke.paint({x: 0, y: 0})
  const result = stroke.paint({x: 20, y: 0})
  expect(result.influences[0]!.weights).toEqual([0, 0.75, 1])
  expect(stroke.paint({x: 20, y: 0})).toEqual(result)
})

test('should smooth from mesh neighbors and restrict painting to selected vertices', () => {
  const binding = skin()
  const source = {
    ...binding,
    influences: binding.influences.map((influence, index) => ({
      ...influence,
      weights: index === 0 ? [0, 0.9, 1] : [1, 0.1, 0],
    })),
  }
  const stroke = createSkinStroke({
    binding: source,
    indices: [0, 1, 2],
    target: 0,
    radius: 30,
    vertices: [0, 0, 10, 0, 20, 0],
    mode: 'smooth',
    protect: false,
    strength: 1,
    selected: [1],
  })
  expect(stroke.paint({x: 10, y: 0}).influences[0]!.weights).toEqual([0, 0.5, 1])
})
