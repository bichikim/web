import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {expect, test} from 'vitest'
import {createBufferEngine} from '../../../buffering/create-buffer-engine'
import {createDecoder} from '../../../buffering/render-frame/create-decoder'
import {createEmptyDocument} from '../../../create-empty-document'
import {createWasmWorker} from '../create-worker'
import type {BufferRequest, PackedBufferFrame} from '../../../buffering/types'

const module = new WebAssembly.Module(readFileSync(resolve(import.meta.dirname, '../runtime.wasm')))
const document = {
  ...createEmptyDocument(),
  parts: [
    {
      id: 'part',
      mesh: {indices: [0, 1, 2], uvs: [0, 0, 1, 0, 0, 1], vertices: [0, 0, 1, 0, 0, 1]},
      texture: {height: 1, src: 'part.png', width: 1},
    },
  ],
  scene: {roots: [{id: 'part', kind: 'part' as const, locked: false, name: 'part', visible: true}]},
}
const setup = () => {
  const worker = createWasmWorker(new WebAssembly.Instance(module))
  const engine = createBufferEngine(document)
  const initial: BufferRequest = {audio: new Map(), document, id: 1, kind: 'initialize'}
  worker.processPacked(initial)
  const step = (): PackedBufferFrame => {
    const response = worker.processPacked({
      id: 2,
      kind: 'produce',
      request: {
        buffer: new ArrayBuffer(engine.bytes),
        deltaTime: 0,
        generation: 0,
        time: 0,
      },
    })
    if (response.kind !== 'produced' || response.frame.kind !== 'frame') {
      throw new Error('Expected packed Rust frame')
    }
    return response.frame
  }
  return {engine, initial, step, worker}
}

test('should transmit reusable templates and lossless numeric buffers from Rust', () => {
  const {engine, step, worker} = setup()
  const decode = createDecoder()
  const expected = engine.step(0, new ArrayBuffer(engine.bytes))
  const first = step()
  expect(decode(first.computed.frame)).toEqual(expected.computed.frame)
  expect(first.computed.vertices).toEqual(expected.computed.vertices)
  expect(first.computed.frame.partTemplates).toHaveLength(1)
  const second = step()
  expect(second.computed.frame.partTemplates).toEqual([])
  expect(decode(second.computed.frame)).toEqual(expected.computed.frame)
  expect(first.computed.frame.parts).not.toBe(second.computed.frame.parts)
  worker.destroy()
})

test('should retain input and previously returned checkpoints across subsequent frames', () => {
  const {engine, worker} = setup()
  const initial = engine.step(0, new ArrayBuffer(engine.bytes)).state
  const input = {revision: 1, settle: false, state: {...initial, modelOpacity: 0.75}}
  const original = structuredClone(input)
  const produce = (value: typeof input) =>
    worker.processPacked({
      id: value.revision + 2,
      kind: 'produce',
      request: {
        buffer: new ArrayBuffer(engine.bytes),
        deltaTime: 1 / 60,
        generation: 0,
        input: value,
        time: value.revision / 60,
      },
    })
  const first = produce(input)
  if (first.kind !== 'produced' || first.frame.kind !== 'frame') {
    throw new Error('Expected first Rust frame')
  }
  const previous = structuredClone(first.frame.state)
  const second = produce({revision: 2, settle: false, state: {...initial, modelOpacity: 0.25}})
  expect(input).toEqual(original)
  expect(first.frame.state).toEqual(previous)
  if (second.kind !== 'produced' || second.frame.kind !== 'frame') {
    throw new Error('Expected second Rust frame')
  }
  expect(first.frame.state.modelOpacity).toBe(0.75)
  expect(second.frame.state.modelOpacity).toBe(0.25)
  worker.destroy()
})

test('should replace structural templates after render overrides and document reload', () => {
  const {engine, initial, step, worker} = setup()
  step()
  const state = engine.step(0, new ArrayBuffer(engine.bytes)).state
  worker.processPacked({
    generation: 0,
    id: 3,
    inputRevision: 1,
    kind: 'reset',
    state: {
      ...state,
      renderOverrides: {...state.renderOverrides, parts: new Map([['part', {culling: true}]])},
    },
  })
  const changed = step()
  expect(changed.computed.frame.partTemplates[0]?.[1].properties.culling).toBe(true)
  worker.processPacked(initial)
  expect(step().computed.frame.partTemplates).toHaveLength(1)
  worker.destroy()
})

test('should retain nested layer identities when only numeric properties change', () => {
  const nested = {
    ...document,
    scene: {
      roots: [
        {
          children: [
            {
              children: document.scene.roots,
              id: 'inner',
              kind: 'group' as const,
              locked: false,
              name: 'inner',
              properties: {offscreen: true},
              visible: true,
            },
          ],
          id: 'outer',
          kind: 'group' as const,
          locked: false,
          name: 'outer',
          properties: {offscreen: true},
          visible: true,
        },
      ],
    },
  }
  const worker = createWasmWorker(new WebAssembly.Instance(module))
  const reference = createBufferEngine(nested)
  const decode = createDecoder()
  worker.processPacked({audio: new Map(), document: nested, id: 1, kind: 'initialize'})
  const step = () => {
    const response = worker.processPacked({
      id: 2,
      kind: 'produce',
      request: {
        buffer: new ArrayBuffer(reference.bytes),
        deltaTime: 0,
        generation: 0,
        time: 0,
      },
    })
    if (response.kind !== 'produced' || response.frame.kind !== 'frame') {
      throw new Error('Expected packed frame')
    }
    return response.frame.computed.frame
  }
  const first = step()
  expect(first.partTemplates[0]?.[1].layerIds).toEqual(['outer', 'inner'])
  expect(decode(first)).toEqual(reference.step(0, new ArrayBuffer(reference.bytes)).computed.frame)
  const initial = reference.step(0, new ArrayBuffer(reference.bytes)).state
  const state = {
    ...initial,
    renderOverrides: {
      ...initial.renderOverrides,
      groups: new Map([['outer', {opacity: 0.25}]]),
    },
  }
  reference.reset(state)
  worker.processPacked({generation: 0, id: 3, inputRevision: 1, kind: 'reset', state})
  const changed = step()
  expect(changed.partTemplates).toEqual([])
  expect(changed.layerTemplates).toEqual([])
  expect(decode(changed)).toEqual(
    reference.step(0, new ArrayBuffer(reference.bytes)).computed.frame,
  )
  worker.destroy()
})
