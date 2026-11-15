import {expect, test} from 'vitest'
import {createEmptyDocument} from '../../create-empty-document'
import type {PuppetDocument, PuppetParameterBinding, PuppetSceneDeformerNode} from '../../document'
import {mixMotionFrames} from '../../playback/mix-motion-frames'
import {computeRenderFrame} from '../compute-render-frame'
import {createNativeDeformation} from '../create-native-deformation'

const part = {
  id: 'part',
  mesh: {
    indices: [0, 1, 2],
    uvs: [0, 0, 0.5, 0.5, 1, 1],
    vertices: [-0.2, -0.1, 0.3, 0.8, 1.2, 1.4],
  },
  texture: {height: 1, src: '', width: 1},
}

const shape: PuppetSceneDeformerNode = {
  bounds: {height: 1, width: 1, x: 0, y: 0},
  children: [{id: part.id, kind: 'part', locked: false, name: 'Part', visible: true}],
  columns: 1,
  controlPoints: [0, 0, 1, 0, 0, 1, 1.2, 1.3],
  coordinateSpace: 'parent',
  id: 'warp',
  interpolation: 'bilinear',
  kind: 'deformer',
  locked: false,
  name: 'Warp',
  rows: 1,
  visible: true,
}

const bind = (nodes: ReadonlyArray<PuppetSceneDeformerNode>): PuppetParameterBinding => ({
  id: 'pose',
  interpolation: 'grid',
  keyforms: [0, 1].map((p) => ({
    deformers: nodes.map((node) => ({
      controlPoints: node.controlPoints.map((value, index) => value + (index % 2 ? -0.1 : 0.2) * p),
      kind: 'deformer',
      nodeId: node.id,
      ...(node.deformerType === 'rotation' ? {rotationScale: 1 + p} : {}),
      ...(node.deformerType === 'spatial'
        ? {spatialRotation: [p * 35, p * 45, p * -20] as const}
        : {}),
    })),
    parts: [],
    values: [p],
  })),
  parameterIds: ['p'],
  targetDeformerIds: nodes.map((node) => node.id),
})

const createDocument = (root: PuppetSceneDeformerNode): PuppetDocument => ({
  ...createEmptyDocument(),
  parameters: [{defaultValue: 0, id: 'p', maximum: 1, minimum: 0, name: 'Pose'}],
  parts: [part],
  scene: {roots: [root]},
})

const compare = (document: PuppetDocument) => {
  const native = createNativeDeformation(document)
  expect(native).toBeDefined()
  for (const p of [0, 0.3, 1, 0.7, 0]) {
    const createBuffers = () =>
      new Map(document.parts.map((part) => [part.id, new Float32Array(part.mesh.vertices)]))
    const expected = createBuffers()
    const actual = createBuffers()
    const options = {
      document,
      mix: mixMotionFrames({document, frames: [], parameterValues: {p}}),
      parameterValues: {p},
    }
    const reference = computeRenderFrame({...options, verticesByPartId: expected})
    const frame = computeRenderFrame({...options, native, verticesByPartId: actual})
    expect(actual).toEqual(expected)
    expect(frame).toEqual(reference)
  }
}

test('should preserve curved strands and their endpoint extensions inside a moving parent warp', () => {
  const curve: PuppetSceneDeformerNode = {
    ...shape,
    controlPoints: [0.5, 0, 1.2, 0.3, -0.2, 0.7, 0.5, 1],
    curveAxis: 'y',
    id: 'curve',
    interpolation: undefined,
  }
  const parent = {...shape, children: [curve], id: 'parent'}
  compare({...createDocument(parent), parameterBindings: [bind([parent, curve])]})
})

test('should preserve document-space rotations inside an animated nonrigid parent', () => {
  const rotation: PuppetSceneDeformerNode = {
    ...shape,
    boneRestPoints: [0, 0, 1, 0],
    controlPoints: [0.2, 0.3, 1.1, 0.7],
    coordinateSpace: undefined,
    deformerType: 'rotation',
    id: 'rotation',
    interpolation: undefined,
  }
  const parent = {...shape, children: [rotation], id: 'parent'}
  compare({...createDocument(parent), parameterBindings: [bind([parent, rotation])]})
})

test('should preserve independent surface handles when a parent sampler reuses its point storage', () => {
  const surface: PuppetSceneDeformerNode = {
    ...shape,
    curveHandles: [
      {horizontal: {x: 0.4, y: -0.2}, pointIndex: 0, vertical: {x: -0.1, y: 0.4}},
      {horizontal: {x: 0.7, y: 0.1}, pointIndex: 1, vertical: {x: 1.1, y: 0.3}},
      {horizontal: {x: 0.3, y: 1.1}, pointIndex: 2, vertical: {x: 0.1, y: 0.7}},
      {horizontal: {x: 0.8, y: 1.2}, pointIndex: 3, vertical: {x: 1.2, y: 0.8}},
    ],
    id: 'surface',
    interpolation: undefined,
  }
  const parent = {...shape, children: [surface], id: 'parent'}
  compare({...createDocument(parent), parameterBindings: [bind([parent, surface])]})
})

test('should retain spatial projection, depth and facing with no ordinary 2D branch', () => {
  const volume: PuppetSceneDeformerNode = {
    ...shape,
    deformerType: 'spatial',
    id: 'volume',
    interpolation: undefined,
  }
  const document: PuppetDocument = {
    ...createDocument(volume),
    parameterBindings: [bind([volume])],
    parts: [
      {
        ...part,
        spatial: {
          controlPoints: [-0.2, -0.1, 0.1, 0.3, 0.8, 0.2, 1.2, 1.4, 0.3],
          groupId: volume.id,
          origin: [0, 0, 0],
        },
      },
    ],
  }
  compare(document)
})
