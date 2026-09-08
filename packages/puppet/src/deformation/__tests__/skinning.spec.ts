import {expect, test} from 'vitest'
import type {PuppetSceneDeformerNode, PuppetScenePartNode} from '../../player/document'
import {applySceneNodeDeformers} from '../vertices'
import {
  createConfiguredSkinBinding,
  createSkinBinding,
  getSkinMatrix,
  invertSkinMatrix,
  resetSkinWeights,
  transformSkinPoint,
} from '../skinning'

const part: PuppetScenePartNode = {
  id: 'part',
  kind: 'part',
  locked: false,
  name: 'Part',
  visible: true,
}
const rotation = (id: string, x: number): PuppetSceneDeformerNode => ({
  deformerType: 'rotation',
  bounds: {width: 100, x: 0, height: 100, y: 0},
  id,
  boneRestPoints: [x, 0, x + 50, 0],
  kind: 'deformer',
  children: [],
  locked: false,
  columns: 1,
  name: id,
  controlPoints: [x, 0, x + 50, 0],
  rows: 1,
  visible: true,
})

test('should blend independent rotations per vertex and preserve the binding pose', () => {
  const a = rotation('a', 0)
  const b = rotation('b', 50)
  const roots = [a, b, part]
  const skinning = createSkinBinding(roots, 'part', ['a', 'b'], [25, 0, 75, 0])!
  expect(skinning).toBeDefined()
  const bound = {
    ...part,
    skinning: {
      ...skinning,
      influences: skinning.influences.map((influence, index) => ({
        ...influence,
        weights: index === 0 ? [1, 0.5] : [0, 0.5],
      })),
    },
  }
  const rest = new Map([['part', [25, 0, 75, 0]]])
  applySceneNodeDeformers([a, b, bound], rest)
  expect(rest.get('part')).toEqual([25, 0, 75, 0])
  const posed = new Map([['part', [25, 0, 75, 0]]])
  applySceneNodeDeformers([{...a, controlPoints: [0, 0, 0, 50]}, b, bound], posed)
  expect(posed.get('part')![0]).toBeCloseTo(0)
  expect(posed.get('part')![1]).toBeCloseTo(25)
  expect(posed.get('part')![2]).toBeCloseTo(75 / Math.sqrt(2))
  expect(posed.get('part')![3]).toBeCloseTo(75 / Math.sqrt(2))
})

test('should include parent rotation once and invert the blended transform for editing', () => {
  const child = rotation('child', 50)
  const parent = {...rotation('parent', 0), children: [child, part]}
  const skinning = createSkinBinding([parent], 'part', ['parent', 'child'], [75, 0])!
  const bound = {
    ...part,
    skinning: {
      ...skinning,
      influences: skinning.influences.map((influence) => ({...influence, weights: [0.5]})),
    },
  }
  const posed = [{...parent, children: [child, bound], controlPoints: [0, 0, 0, 50]}]
  const vertices = new Map([['part', [75, 0]]])
  applySceneNodeDeformers(posed, vertices)
  expect(vertices.get('part')![0]).toBeCloseTo(0)
  expect(vertices.get('part')![1]).toBeCloseTo(75)
  const matrix = getSkinMatrix(posed, bound.skinning, 0)!
  const inverse = invertSkinMatrix(matrix)!
  expect(transformSkinPoint(inverse, {x: 0, y: 75}).x).toBeCloseTo(75)
})

test('should bind without jumping when rotations are already posed', () => {
  const a = {...rotation('a', 0), children: [part], controlPoints: [10, 0, 10, 50]}
  const b = rotation('b', 50)
  const skinning = createSkinBinding([a, b], 'part', ['a', 'b'], [25, 0])!
  const before = new Map([['part', [25, 0]]])
  const after = new Map([['part', [25, 0]]])
  applySceneNodeDeformers([a, b], before)
  applySceneNodeDeformers([{...a, children: [{...part, skinning}]}, b], after)
  expect(after.get('part')![0]).toBeCloseTo(before.get('part')![0]!)
  expect(after.get('part')![1]).toBeCloseTo(before.get('part')![1]!)
})

test('should skip a nonrotation subtree without omitting its valid siblings', () => {
  const warp = {...rotation('warp', 0), deformerType: undefined}
  expect(
    createSkinBinding(
      [warp, rotation('a', 0), rotation('b', 50), part],
      'part',
      ['a', 'b'],
      [25, 0],
    ),
  ).toBeDefined()
  expect(
    createSkinBinding(
      [{...warp, children: [part]}, rotation('a', 0), rotation('b', 50)],
      'part',
      ['a', 'b'],
      [25, 0],
    ),
  ).toBeUndefined()
})

test('should keep the wrist end on its owning rotation while blending only near the elbow', () => {
  const fore = {...part, id: 'fore'}
  const wrist = {
    ...rotation('wrist', 520),
    boneRestPoints: [520, 250, 585, 250],
    controlPoints: [520, 250, 585, 250],
  }
  const elbow = {
    ...rotation('elbow', 368),
    boneRestPoints: [368, 250, 520, 250],
    children: [fore, wrist],
    controlPoints: [368, 250, 520, 250],
  }
  const shoulder = {
    ...rotation('shoulder', 195),
    boneRestPoints: [195, 250, 368, 250],
    children: [elbow],
    controlPoints: [195, 250, 368, 250],
  }
  const mesh = [340, 222, 535, 222, 535, 278, 340, 278]
  const skinning = createSkinBinding([shoulder], 'fore', ['shoulder', 'elbow'], mesh)!
  expect(skinning.influences[1]!.weights[1]).toBe(1)
  expect(skinning.influences[1]!.weights[2]).toBe(1)
  expect(skinning.influences[0]!.weights).toEqual([0, 0, 0, 0])
  const posed = {...elbow, controlPoints: [368, 250, 368, 98]}
  const skinned = new Map([['fore', [...mesh]]])
  const rigid = new Map([['fore', [...mesh]]])
  applySceneNodeDeformers(
    [{...shoulder, children: [{...posed, children: [{...fore, skinning}, wrist]}]}],
    skinned,
  )
  applySceneNodeDeformers([{...shoulder, children: [posed]}], rigid)
  expect(skinned.get('fore')!.slice(2, 6)).toEqual(rigid.get('fore')!.slice(2, 6))
})

test('should repair saved weights using the original binding pose after posing the elbow', () => {
  const elbow = {...rotation('elbow', 50), children: [part]}
  const parent = {...rotation('parent', 0), children: [elbow]}
  const binding = createSkinBinding([parent], 'part', ['parent', 'elbow'], [100, 0])!
  const old = {
    ...binding,
    influences: binding.influences.map((influence) => ({...influence, weights: [0.5]})),
  }
  const roots = [
    {
      ...parent,
      children: [{...elbow, children: [{...part, skinning: old}], controlPoints: [50, 0, 50, 50]}],
    },
  ]
  const repaired = resetSkinWeights(roots, 'part', [100, 0])!
  expect(repaired.bind).toEqual(old.bind)
  expect(repaired.influences[1]!.inverseBind).toEqual(old.influences[1]!.inverseBind)
  expect(repaired.influences[1]!.weights).toEqual([1])
  const result = new Map([['part', [100, 0]]])
  applySceneNodeDeformers(
    [
      {
        ...parent,
        children: [
          {...elbow, children: [{...part, skinning: repaired}], controlPoints: [50, 0, 50, 50]},
        ],
      },
    ],
    result,
  )
  expect(result.get('part')![0]).toBeCloseTo(50)
  expect(result.get('part')![1]).toBeCloseTo(50)
})

test('should blend a subdivided mesh near the joint while retaining its distal section', () => {
  const elbow = {...rotation('elbow', 50), children: [part]}
  const parent = {...rotation('parent', 0), children: [elbow]}
  const mesh = [50, -10, 50, 10, 60, -10, 60, 10, 75, -10, 75, 10, 100, -10, 100, 10]
  const skinning = createSkinBinding([parent], 'part', ['parent', 'elbow'], mesh)!
  expect(skinning.influences[0]!.weights[0]).toBeGreaterThan(0)
  expect(skinning.influences[0]!.weights[2]).toBeGreaterThan(0)
  expect(skinning.influences[0]!.weights[6]).toBe(0)
  const positions = new Map([['part', [...mesh]]])
  applySceneNodeDeformers(
    [
      {
        ...parent,
        children: [{...elbow, children: [{...part, skinning}], controlPoints: [50, 0, 50, 50]}],
      },
    ],
    positions,
  )
  const output = positions.get('part')!
  for (let index = 0; index < output.length; index += 4) {
    expect(
      Math.hypot(output[index]! - output[index + 2]!, output[index + 1]! - output[index + 3]!),
    ).toBeCloseTo(20)
  }
  expect(output[12]).toBeCloseTo(60)
  expect(output[13]).toBeCloseTo(50)
})

test('should automatically blend the distal section with the connected child and preserve cross sections', () => {
  const child = rotation('child', 100)
  const owner = {...rotation('owner', 50), children: [part, child]}
  const parent = {...rotation('parent', 0), children: [owner]}
  const mesh = [
    50, -10, 50, 10, 60, -10, 60, 10, 75, -10, 75, 10, 90, -10, 90, 10, 100, -10, 100, 10,
  ]
  const skinning = createSkinBinding([parent], 'part', ['parent', 'owner', 'child'], mesh)!
  expect(skinning.influences[2]!.weights).toEqual([
    0,
    0,
    0,
    0,
    0,
    0,
    expect.closeTo(0.3),
    expect.closeTo(0.3),
    0.5,
    0.5,
  ])
  const posed = new Map([['part', [...mesh]]])
  const roots = [
    {
      ...parent,
      children: [
        {
          ...owner,
          children: [
            {...part, skinning},
            {...child, controlPoints: [100, 0, 100, 50]},
          ],
        },
      ],
    },
  ]
  applySceneNodeDeformers(roots, posed)
  const output = posed.get('part')!
  expect(output.slice(0, 12)).toEqual(mesh.slice(0, 12))
  expect(output.slice(12)).not.toEqual(mesh.slice(12))
  for (let index = 0; index < output.length; index += 4) {
    expect(
      Math.hypot(output[index]! - output[index + 2]!, output[index + 1]! - output[index + 3]!),
    ).toBeCloseTo(20)
    expect(
      skinning.influences.reduce((sum, influence) => sum + influence.weights[index / 2]!, 0),
    ).toBeCloseTo(1)
  }
  expect(resetSkinWeights(roots, 'part', mesh)).toEqual(skinning)
})

test('should blend a selected child without a selected parent but exclude disconnected descendants', () => {
  const child = rotation('child', 100)
  const remote = rotation('remote', 200)
  const owner = {
    ...rotation('owner', 50),
    children: [
      part,
      {
        id: 'group',
        kind: 'group' as const,
        locked: false,
        children: [child, remote],
        name: 'Group',
        visible: true,
      },
    ],
  }
  const mesh = [50, -10, 50, 10, 90, -10, 90, 10, 100, -10, 100, 10]
  const skinning = createSkinBinding([owner], 'part', ['owner', 'child', 'remote'], mesh)!
  expect(skinning.influences[1]!.weights[4]).toBe(0.5)
  expect(skinning.influences[2]!.weights).toEqual([0, 0, 0, 0, 0, 0])
})

test('should spread smooth automatic weights across neighboring bones and honor the range', () => {
  const roots = [
    {...rotation('a', 0), children: [part]},
    rotation('b', 50),
    rotation('c', 100),
    rotation('d', 150),
  ]
  const narrow = createConfiguredSkinBinding({
    nodes: roots,
    nodeIds: ['a', 'b', 'c', 'd'],
    partId: 'part',
    options: {
      mode: 'smooth',
      range: 0.5,
    },
    vertices: [75, 0],
  })!
  const wide = createConfiguredSkinBinding({
    nodes: roots,
    nodeIds: ['a', 'b', 'c', 'd'],
    partId: 'part',
    options: {
      mode: 'smooth',
      range: 2,
    },
    vertices: [75, 0],
  })!
  expect(wide.influences[3]!.weights[0]).toBeGreaterThan(narrow.influences[3]!.weights[0]!)
  expect(wide.influences.reduce((sum, value) => sum + value.weights[0]!, 0)).toBeCloseTo(1)
  const node = {...part, skinning: wide}
  const reset = resetSkinWeights(
    [{...rotation('a', 0), children: [node]}, ...roots.slice(1)],
    'part',
    [75, 0],
  )!
  expect(reset).toEqual(wide)
})
