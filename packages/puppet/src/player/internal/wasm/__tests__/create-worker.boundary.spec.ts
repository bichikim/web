import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {expect, test} from 'vitest'
import {createBufferEngine} from '../../../buffering/create-buffer-engine'
import {createEmptyDocument} from '../../../create-empty-document'
import type {PuppetSceneNode} from '../../../document'
import {parseDocument} from '../../../parse-document'
import {createWasmWorker} from '../create-worker'

const module = new WebAssembly.Module(readFileSync(resolve(import.meta.dirname, '../runtime.wasm')))
const nested = (depth: number) => {
  const leaf: PuppetSceneNode = {
    id: 'part',
    kind: 'part',
    locked: false,
    name: 'Part',
    visible: true,
  }
  const root = Array.from({length: depth}, (_, index) => index).reduce<PuppetSceneNode>(
    (child, index) => ({
      children: [child],
      id: `g${index}`,
      kind: 'group',
      locked: false,
      name: `Group ${index}`,
      visible: true,
    }),
    leaf,
  )
  return {
    ...createEmptyDocument(),
    parts: [
      {
        id: 'part',
        mesh: {indices: [0, 1, 2], uvs: [0, 0, 1, 0, 0, 1], vertices: [0, 0, 1, 0, 0, 1]},
        texture: {height: 1, src: 'part.png', width: 1},
      },
    ],
    scene: {roots: [root]},
  }
}

test.each([64, 120])(
  'should initialize and evaluate a valid model with %s nested groups',
  (depth) => {
    const document = nested(depth)
    expect(parseDocument(JSON.stringify(document)).ok).toBe(true)
    const reference = createBufferEngine(document)
    const worker = createWasmWorker(new WebAssembly.Instance(module))
    try {
      expect(worker.process({audio: new Map(), document, id: 41, kind: 'initialize'})).toEqual({
        bytes: reference.bytes,
        id: 41,
        kind: 'initialized',
      })
      const result = worker.process({
        id: 42,
        kind: 'produce',
        request: {buffer: new ArrayBuffer(reference.bytes), deltaTime: 0, generation: 0, time: 0},
      })
      if (result.kind !== 'produced' || result.frame.kind !== 'frame') {
        throw new Error('Expected frame')
      }
      expect(result.frame.computed.vertices).toEqual(
        reference.step(0, new ArrayBuffer(reference.bytes)).computed.vertices,
      )
    } finally {
      worker.destroy()
    }
  },
)

test('should correlate an excessive-depth error and allow a later valid initialization', () => {
  const worker = createWasmWorker(new WebAssembly.Instance(module))
  try {
    expect(
      worker.process({audio: new Map(), document: nested(160), id: 53, kind: 'initialize'}),
    ).toMatchObject({id: 53, kind: 'error'})
    expect(
      worker.process({
        audio: new Map(),
        document: createEmptyDocument(),
        id: 54,
        kind: 'initialize',
      }),
    ).toMatchObject({id: 54, kind: 'initialized'})
  } finally {
    worker.destroy()
  }
})

test.each([
  'ordinary',
  '__poffoArray',
  '__poffoUndefined',
  '__poffoTyped',
  '__poffoMap',
  '__poffoNumber',
  '__proto__',
  'constructor',
])('should retain parameter ID %s in inputs, checkpoints and computed values', (id) => {
  const document = {
    ...createEmptyDocument(),
    parameters: [{defaultValue: 0, id, maximum: 2, minimum: 0, name: id}],
  }
  const reference = createBufferEngine(document)
  const worker = createWasmWorker(new WebAssembly.Instance(module))
  try {
    expect(worker.process({audio: new Map(), document, id: 1, kind: 'initialize'}).kind).toBe(
      'initialized',
    )
    const initial = reference.step(0, new ArrayBuffer(0)).state
    const state = {...initial, parameterValues: {[id]: 1}}
    reference.reset(state)
    expect(
      worker.process({generation: 1, id: 2, inputRevision: 0, kind: 'reset', state}).kind,
    ).toBe('reset')
    const result = worker.process({
      id: 3,
      kind: 'produce',
      request: {buffer: new ArrayBuffer(0), deltaTime: 0, generation: 1, time: 0},
    })
    if (result.kind !== 'produced' || result.frame.kind !== 'frame') {
      throw new Error('Expected frame')
    }
    const expected = reference.step(0, new ArrayBuffer(0))
    expect(result.frame.state.frameValues).toEqual(expected.state.frameValues)
    expect(result.frame.state.parameterValues).toEqual(expected.state.parameterValues)
    expect(result.frame.computed.parameterValues).toEqual(expected.computed.parameterValues)
  } finally {
    worker.destroy()
  }
})

test.each(['playing', 'paused', 'stopped', 'finished'] as const)(
  'should report %s motion frames consistently with JS',
  (status) => {
    const document = {...createEmptyDocument(), motions: [{duration: 2, id: 'idle', tracks: []}]}
    const reference = createBufferEngine(document)
    const worker = createWasmWorker(new WebAssembly.Instance(module))
    try {
      worker.process({audio: new Map(), document, id: 1, kind: 'initialize'})
      const initial = reference.step(0, new ArrayBuffer(0)).state
      const state = {...initial, playback: {...initial.playback, status, time: 0.25}}
      reference.reset(state)
      worker.process({generation: 1, id: 2, inputRevision: 0, kind: 'reset', state})
      const result = worker.process({
        id: 3,
        kind: 'produce',
        request: {buffer: new ArrayBuffer(0), deltaTime: 0, generation: 1, time: 0},
      })
      if (result.kind !== 'produced' || result.frame.kind !== 'frame') {
        throw new Error('Expected frame')
      }
      expect(result.frame.playback).toEqual(reference.step(0, new ArrayBuffer(0)).playback)
      expect(result.frame.state.playback.motionId).toBe('idle')
    } finally {
      worker.destroy()
    }
  },
)
