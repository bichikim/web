import connectedCurve from '../../../examples/connected-curve.json'
import curvedStrand from '../../../examples/strand-curve.json'
import strand from '../../../examples/strand.json'
import example from '../../../examples/rotation-skinning.json'
import {parseDocument} from '../../player/parse-document'
import {composeParameterScene} from '../scene'
import type {PuppetSceneDeformerNode, PuppetSceneNode} from '../../player/document'
import {expect, test} from 'vitest'
import {applySceneNodeDeformers} from '../vertices'
import {rebindDeformer} from '../binding'

const node: PuppetSceneDeformerNode = {
  boneRestPoints: [0, 0, 50, 0, 100, 0],
  bounds: {height: 100, width: 100, x: 0, y: 0},
  boneWeights: [
    {partId: 'a', vertexIndex: 0, weights: [1, 0]},
    {partId: 'a', vertexIndex: 1, weights: [0, 1]},
  ],
  children: ['a', 'b'].map((id) => ({id, kind: 'part', locked: false, name: id, visible: true})),
  columns: 1,
  controlPoints: [0, 0, 50, 0, 50, 50],
  id: 'bone',
  kind: 'deformer',
  locked: false,
  name: 'Bone',
  rows: 1,
  visible: true,
}

test('should apply different bone weights to coincident vertices and retain automatic weights for other parts', () => {
  const vertices = new Map([
    ['a', [75, 0, 75, 0]],
    ['b', [75, 0]],
  ])
  applySceneNodeDeformers([node], vertices)
  expect(vertices.get('a')![0]).toBeCloseTo(75)
  expect(vertices.get('a')![1]).toBeCloseTo(0)
  expect(vertices.get('a')![2]).toBeCloseTo(50)
  expect(vertices.get('a')![3]).toBeCloseTo(25)
  expect(vertices.get('b')![1]).toBeGreaterThan(24)
})

test('should preserve weighted deformation through a rest-layout rebind', () => {
  const rebound = rebindDeformer(node, {
    ...node,
    boneRestPoints: [0, 10, 50, 10, 100, 10],
    controlPoints: [0, 10, 50, 10, 100, 10],
  })
  const before = new Map([['a', [75, 0, 75, 0]]])
  const after = new Map([['a', [75, 0, 75, 0]]])
  applySceneNodeDeformers([node], before)
  applySceneNodeDeformers([rebound], after)
  expect(after).toEqual(before)
})

test('should compose weighted child and parent deformers with the same vertex identity', () => {
  const parent = {...node, children: [node], controlPoints: [10, 0, 60, 0, 110, 0], id: 'parent'}
  const vertices = new Map([['a', [75, 0, 75, 0]]])
  applySceneNodeDeformers([parent], vertices)
  expect(vertices.get('a')![0]).toBeCloseTo(85)
  expect(vertices.get('a')![2]).toBeCloseTo(60)
  expect(vertices.get('a')![3]).toBeCloseTo(25)
})

test('should keep the unweighted portion at its input position for a single bone', () => {
  const single = {
    ...node,
    boneRestPoints: [0, 0, 100, 0],
    boneWeights: [0, 0.25, 1].map((weight, vertexIndex) => ({
      partId: 'a',
      vertexIndex,
      weights: [weight],
    })),
    controlPoints: [20, 0, 120, 0],
  }
  const vertices = new Map([
    ['a', [50, 0, 50, 0, 50, 0]],
    ['b', [50, 0]],
  ])
  applySceneNodeDeformers([single], vertices)
  expect(vertices.get('a')).toEqual([50, 0, 55, 0, 70, 0])
  expect(vertices.get('b')).toEqual([70, 0])
})

test('should carry the child pivot with parent rotation without moving parents or siblings from child rotation', () => {
  const child: PuppetSceneDeformerNode = {
    ...node,
    boneRestPoints: [50, 0, 100, 0],
    boneWeights: undefined,
    children: [node.children[1]!],
    controlPoints: [50, 0, 50, 50],
    deformerType: 'rotation',
    id: 'elbow',
  }
  const parent: PuppetSceneDeformerNode = {
    ...child,
    boneRestPoints: [0, 0, 50, 0],
    children: [node.children[0]!, child],
    controlPoints: [0, 0, 0, 50],
    id: 'shoulder',
  }
  const vertices = new Map([
    ['a', [25, 0]],
    ['b', [75, 0]],
    ['outside', [75, 0]],
  ])
  applySceneNodeDeformers([parent], vertices)
  expect(vertices.get('a')![0]).toBeCloseTo(0)
  expect(vertices.get('a')![1]).toBeCloseTo(25)
  expect(vertices.get('b')![0]).toBeCloseTo(-25)
  expect(vertices.get('b')![1]).toBeCloseTo(50)
  expect(vertices.get('outside')).toEqual([75, 0])
})

test('should keep the example cross sections and wrist attachment throughout its angle range', () => {
  const result = parseDocument(JSON.stringify(example))
  if (!result.ok) {
    throw new Error('Invalid skinning example')
  }
  const document = result.document
  const fore = document.parts.find((part) => part.id === 'fore')!
  for (const shoulder of [-90, 0, 90]) {
    for (let elbow = -90; elbow <= 90; elbow += 15) {
      const scene = composeParameterScene(document, {
        'elbow-angle': elbow,
        'shoulder-angle': shoulder,
      })
      const actual = new Map([['fore', [...fore.mesh.vertices]]])
      applySceneNodeDeformers(scene.roots, actual)
      const vertices = actual.get('fore')!
      for (let index = 0; index < vertices.length; index += 4) {
        expect(
          Math.hypot(
            vertices[index]! - vertices[index + 2]!,
            vertices[index + 1]! - vertices[index + 3]!,
          ),
        ).toBeCloseTo(56)
      }
      for (let index = 0; index < fore.mesh.indices.length; index += 3) {
        const [a, b, c] = fore.mesh.indices.slice(index, index + 3).map((vertex) => vertex * 2)
        const area =
          (vertices[b!]! - vertices[a!]!) * (vertices[c! + 1]! - vertices[a! + 1]!) -
          (vertices[c!]! - vertices[a!]!) * (vertices[b! + 1]! - vertices[a! + 1]!)
        expect(area).toBeGreaterThan(0)
      }
      const strip = (nodes: ReadonlyArray<PuppetSceneNode>): ReadonlyArray<PuppetSceneNode> =>
        nodes.map((node) =>
          node.kind === 'part'
            ? {...node, skinning: undefined}
            : {...node, children: strip(node.children)},
        )
      const rigid = new Map([['fore', [...fore.mesh.vertices]]])
      applySceneNodeDeformers(strip(scene.roots), rigid)
      for (let index = vertices.length - 4; index < vertices.length; index += 1) {
        expect(vertices[index]).toBeCloseTo(rigid.get('fore')![index]!)
      }
    }
  }
})

test('should bend one continuous strand with four rotations without flipped triangles', () => {
  const parsed = parseDocument(JSON.stringify(strand))
  if (!parsed.ok) {
    throw new Error('Invalid strand example')
  }
  const document = parsed.document
  expect(document.parts).toHaveLength(1)
  const mesh = document.parts[0]!.mesh
  for (const angle of [-30, -15, 0, 15, 30]) {
    const scene = composeParameterScene(document, {
      'lower-angle': -angle,
      'middle-angle': angle,
      'root-angle': 0,
      'tip-angle': angle,
    })
    const output = new Map([['strand', [...mesh.vertices]]])
    applySceneNodeDeformers(scene.roots, output)
    const vertices = output.get('strand')!
    expect(vertices.slice(0, 4)).toEqual(mesh.vertices.slice(0, 4))
    if (angle !== 0) {
      expect(vertices.slice(-4)).not.toEqual(mesh.vertices.slice(-4))
    }
    for (let index = 0; index < mesh.indices.length; index += 3) {
      const [a, b, c] = mesh.indices.slice(index, index + 3).map((value) => value * 2)
      const area =
        (vertices[b!]! - vertices[a!]!) * (vertices[c! + 1]! - vertices[a! + 1]!) -
        (vertices[c!]! - vertices[a!]!) * (vertices[b! + 1]! - vertices[a! + 1]!)
      expect(area).toBeGreaterThan(0)
    }
  }
})

test('should limit strand direction changes at dominant bone boundaries', () => {
  const parsed = parseDocument(JSON.stringify(strand))
  if (!parsed.ok) {
    throw new Error('Invalid strand example')
  }
  const document = parsed.document
  const mesh = document.parts[0]!.mesh
  for (const angle of [-30, 0, 30]) {
    for (const lower of [-30, 0, 30]) {
      for (const tip of [-30, 0, 30]) {
        const scene = composeParameterScene(document, {
          'lower-angle': lower,
          'middle-angle': angle,
          'root-angle': 0,
          'tip-angle': tip,
        })
        const output = new Map([['strand', [...mesh.vertices]]])
        applySceneNodeDeformers(scene.roots, output)
        const vertices = output.get('strand')!
        const center = (index: number) => ({
          x: (vertices[index * 4]! + vertices[index * 4 + 2]!) / 2,
          y: (vertices[index * 4 + 1]! + vertices[index * 4 + 3]!) / 2,
        })
        for (const index of [6, 18, 30, 42]) {
          const before = center(index - 1)
          const current = center(index)
          const after = center(index + 1)
          const incoming = Math.atan2(current.y - before.y, current.x - before.x)
          const outgoing = Math.atan2(after.y - current.y, after.x - current.x)
          const turn =
            (Math.abs(Math.atan2(Math.sin(outgoing - incoming), Math.cos(outgoing - incoming))) *
              180) /
            Math.PI
          expect(turn, `section ${index}, angles ${angle}/${lower}/${tip}`).toBeLessThan(5)
        }
      }
    }
  }
})

test('should bend a strand along a circular arc while preserving its cross sections', () => {
  const parsed = parseDocument(JSON.stringify(curvedStrand))
  if (!parsed.ok) {
    throw new Error('Invalid curve example')
  }
  const document = parsed.document
  const mesh = document.parts[0]!.mesh
  const scene = composeParameterScene(document, {bend: 1})
  const output = new Map([['strand', [...mesh.vertices]]])
  applySceneNodeDeformers(scene.roots, output)
  const vertices = output.get('strand')!
  for (let index = 0; index < vertices.length; index += 4) {
    const x = (vertices[index]! + vertices[index + 2]!) / 2
    const y = (vertices[index + 1]! + vertices[index + 3]!) / 2
    expect(Math.abs(Math.hypot(x - 140, y - 550) - 300)).toBeLessThan(0.1)
    expect(
      Math.hypot(
        vertices[index]! - vertices[index + 2]!,
        vertices[index + 1]! - vertices[index + 3]!,
      ),
    ).toBeCloseTo(mesh.vertices[index + 3]! - mesh.vertices[index + 1]!)
  }
  for (let index = 0; index < mesh.indices.length; index += 3) {
    const [a, b, c] = mesh.indices.slice(index, index + 3).map((value) => value * 2)
    expect(
      (vertices[b!]! - vertices[a!]!) * (vertices[c! + 1]! - vertices[a! + 1]!) -
        (vertices[c!]! - vertices[a!]!) * (vertices[b! + 1]! - vertices[a! + 1]!),
    ).toBeGreaterThan(0)
  }
})

test('should keep three separate parts joined and tangent-aligned along a shared curve', () => {
  const parsed = parseDocument(JSON.stringify(connectedCurve))
  if (!parsed.ok) {
    throw new Error('Invalid connected curve example')
  }
  const document = parsed.document
  expect(document.parts).toHaveLength(3)
  expect(document.glue).toHaveLength(4)
  for (const bend of [-1, -0.5, 0, 0.5, 1]) {
    const output = new Map(document.parts.map((part) => [part.id, [...part.mesh.vertices]]))
    applySceneNodeDeformers(composeParameterScene(document, {bend}).roots, output)
    for (const seam of document.glue!) {
      const a = output.get(seam.first.partId)!
      const b = output.get(seam.second.partId)!
      for (const axis of [0, 1]) {
        expect(a[seam.first.vertexIndex * 2 + axis]).toBeCloseTo(
          b[seam.second.vertexIndex * 2 + axis]!,
          8,
        )
      }
    }
    for (const [left, right] of [
      ['a', 'b'],
      ['b', 'c'],
    ]) {
      const a = output.get(left!)!
      const b = output.get(right!)!
      const x = (a.at(-4)! + a.at(-2)!) / 2
      const y = (a.at(-3)! + a.at(-1)!) / 2
      const incoming = Math.atan2(y - (a.at(-7)! + a.at(-5)!) / 2, x - (a.at(-8)! + a.at(-6)!) / 2)
      const outgoing = Math.atan2((b[5]! + b[7]!) / 2 - y, (b[4]! + b[6]!) / 2 - x)
      expect(
        (Math.abs(Math.atan2(Math.sin(outgoing - incoming), Math.cos(outgoing - incoming))) * 180) /
          Math.PI,
      ).toBeLessThan(5)
    }
  }
})
