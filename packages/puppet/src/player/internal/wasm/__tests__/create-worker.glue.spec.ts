import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {expect, test} from 'vitest'
import {createBufferEngine} from '../../../buffering/create-buffer-engine'
import {createEmptyDocument} from '../../../create-empty-document'
import type {PuppetDocument, PuppetGlue, PuppetGlueMode} from '../../../document'
import {createWasmWorker} from '../create-worker'

const module = new WebAssembly.Module(readFileSync(resolve(import.meta.dirname, '../runtime.wasm')))
const document = (mode: PuppetGlueMode): PuppetDocument => ({
  ...createEmptyDocument(),
  glue: [
    {
      first: {partId: 'hand', vertexIndex: 0},
      id: 'wrist',
      mode,
      rotation: {first: 1, second: 1},
      second: {edge: {endIndex: 1, position: 0.5}, partId: 'arm', vertexIndex: 0},
      strength: 1,
      weight: 1,
    },
  ],
  parts: [
    {
      id: 'hand',
      mesh: {indices: [0, 1, 2], uvs: [0, 0, 1, 0, 0, 1], vertices: [0, 0, 4, 0, 1, -3]},
      texture: {height: 1, src: 'hand.png', width: 1},
    },
    {
      id: 'arm',
      mesh: {indices: [0, 1, 2], uvs: [0, 0, 1, 0, 0, 1], vertices: [10, 10, 10, 18, 14, 10]},
      texture: {height: 1, src: 'arm.png', width: 1},
    },
  ],
  scene: {
    roots: ['hand', 'arm'].map((id) => ({
      id,
      kind: 'part',
      locked: false,
      name: id,
      visible: true,
    })),
  },
})

test.each([
  {mode: 'vertex'},
  {mode: 'translate'},
  {mode: 'rigid'},
  {mode: 'rigid', rotation: {first: 0, second: 1}},
  {mode: 'rigid', rotation: {first: 1, second: 0}},
] as const)('should match shared whole-part attachment for $mode and $rotation', (override) => {
  const base = document(override.mode)
  const connection: PuppetGlue = {
    ...base.glue![0]!,
    ...override,
    second: {partId: 'arm', vertexIndex: 0},
    strength: 0.6,
    weight: 0.25,
  }
  const source = {...base, glue: [connection]}
  const reference = createBufferEngine(source)
  const worker = createWasmWorker(new WebAssembly.Instance(module))
  try {
    worker.process({audio: new Map(), document: source, id: 1, kind: 'initialize'})
    worker.process({
      generation: 1,
      id: 2,
      inputRevision: 0,
      kind: 'reset',
      state: reference.step(0, new ArrayBuffer(reference.bytes)).state,
    })
    for (let index = 0; index < 3; index += 1) {
      const response = worker.process({
        id: index + 3,
        kind: 'produce',
        request: {buffer: new ArrayBuffer(reference.bytes), deltaTime: 0, generation: 1, time: 0},
      })
      if (response.kind !== 'produced' || response.frame.kind !== 'frame') {
        throw new Error('Expected a frame')
      }
      expect(response.frame.computed.vertices).toEqual(
        reference.step(0, new ArrayBuffer(reference.bytes)).computed.vertices,
      )
    }
  } finally {
    worker.destroy()
  }
})

test.each([
  ['translate', [10, 14, 14, 14, 11, 11]],
  ['rigid', [10, 14, 10, 18, 13, 15]],
] as const)('should preserve complete hand geometry for %s wrist attachment', (mode, expected) => {
  const source = document(mode)
  const reference = createBufferEngine(source)
  const worker = createWasmWorker(new WebAssembly.Instance(module))
  try {
    expect(worker.process({audio: new Map(), document: source, id: 1, kind: 'initialize'})).toEqual(
      {bytes: reference.bytes, id: 1, kind: 'initialized'},
    )
    const state = reference.step(0, new ArrayBuffer(reference.bytes)).state
    worker.process({generation: 1, id: 2, inputRevision: 0, kind: 'reset', state})
    const response = worker.process({
      id: 3,
      kind: 'produce',
      request: {buffer: new ArrayBuffer(reference.bytes), deltaTime: 0, generation: 1, time: 0},
    })
    expect(response.kind).toBe('produced')
    if (response.kind !== 'produced' || response.frame.kind !== 'frame') {
      throw new Error('Expected a frame')
    }
    const vertices = Array.from(response.frame.computed.vertices)
    expect(vertices.slice(0, 6)).toEqual(expected)
    expect(vertices.slice(6)).toEqual([10, 10, 10, 18, 14, 10])
    expect(response.frame.computed.vertices).toEqual(
      reference.step(0, new ArrayBuffer(reference.bytes)).computed.vertices,
    )
  } finally {
    worker.destroy()
  }
})
