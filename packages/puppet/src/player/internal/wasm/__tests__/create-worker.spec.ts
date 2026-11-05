import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {expect, test} from 'vitest'
import {createBufferEngine} from '../../../buffering/create-buffer-engine'
import type {BufferFrame, BufferResponse} from '../../../buffering/types'
import {createEmptyDocument} from '../../../create-empty-document'
import type {PuppetDocument} from '../../../document'
import {createWasmWorker} from '../create-worker'

const module = new WebAssembly.Module(readFileSync(resolve(import.meta.dirname, '../runtime.wasm')))
const expectFrame = (response: BufferResponse): BufferFrame => {
  if (response.kind !== 'produced' || response.frame.kind !== 'frame') {
    throw new Error(`Expected frame, received ${JSON.stringify(response)}`)
  }
  return response.frame
}
const triangle = (id: string) => ({
  id,
  mesh: {indices: [0, 1, 2], uvs: [0, 0, 1, 0, 0, 1], vertices: [0, 0, 1, 0, 0, 1]},
  texture: {height: 1, src: 'a.png', width: 1},
})
const source: PuppetDocument = {
  ...createEmptyDocument(),
  glue: [
    {
      first: {partId: 'first', vertexIndex: 0},
      id: 'join',
      second: {partId: 'second', vertexIndex: 0},
      strength: 0.8,
      weight: 0.25,
    },
  ],
  motions: [
    {
      duration: 1,
      events: [{time: 0.05, value: 'mark'}],
      id: 'idle',
      loop: true,
      tracks: [
        {
          keyframes: [
            {time: 0, value: 0},
            {time: 1, value: 1},
          ],
          kind: 'parameter',
          parameterId: 'p',
        },
      ],
    },
  ],
  parameters: ['p', 'q'].map((id) => ({defaultValue: 0, id, maximum: 5, minimum: -5, name: id})),
  parts: [triangle('first'), triangle('second')],
  physics: {
    pendulums: [
      {
        damping: 0.2,
        gravity: 4,
        id: 'spring',
        inputParameterId: 'p',
        inputScale: 1,
        length: 1,
        outputParameterId: 'q',
        outputScale: 0.5,
      },
    ],
  },
  scene: {
    roots: [
      {id: 'first', kind: 'part', locked: false, name: 'first', visible: true},
      {id: 'second', kind: 'part', locked: false, name: 'second', visible: true},
    ],
  },
}

test('should run complete motion, pendulum, Glue and checkpoint evaluation inside Wasm', () => {
  const reference = createBufferEngine(source)
  const worker = createWasmWorker(new WebAssembly.Instance(module))
  expect(worker.process({audio: new Map(), document: source, id: 1, kind: 'initialize'})).toEqual({
    bytes: reference.bytes,
    id: 1,
    kind: 'initialized',
  })
  const initial = reference.step(0, new ArrayBuffer(reference.bytes)).state
  expect(
    worker.process({generation: 1, id: 2, inputRevision: 0, kind: 'reset', state: initial}),
  ).toEqual({id: 2, kind: 'reset'})
  for (let frame = 0; frame < 12; frame += 1) {
    const expected = reference.step(1 / 120, new ArrayBuffer(reference.bytes))
    const actual = expectFrame(
      worker.process({
        id: frame + 3,
        kind: 'produce',
        request: {
          buffer: new ArrayBuffer(reference.bytes),
          deltaTime: 1 / 120,
          generation: 1,
          time: frame / 120,
        },
      }),
    )
    expect(actual.state.frameValues.p).toBeCloseTo(expected.state.frameValues.p!, 10)
    expect(actual.state.frameValues.q).toBeCloseTo(expected.state.frameValues.q!, 10)
    expect(actual.computed.frame).toEqual(expected.computed.frame)
    expect(actual.state).toEqual(expected.state)
    expect(actual.playback).toEqual(expected.playback)
    expect(actual.state.notices).toEqual(expected.state.notices)
    actual.computed.vertices.forEach((value, index) =>
      expect(value).toBeCloseTo(expected.computed.vertices[index]!, 6),
    )
  }
})

test('should reject stale generations through the Wasm protocol without advancing playback', () => {
  const worker = createWasmWorker(new WebAssembly.Instance(module))
  const document = createEmptyDocument()
  worker.process({audio: new Map(), document, id: 1, kind: 'initialize'})
  const state = createBufferEngine(document).step(0, new ArrayBuffer(0)).state
  worker.process({generation: 2, id: 2, inputRevision: 0, kind: 'reset', state})
  const buffer = new ArrayBuffer(0)
  const response = worker.process({
    id: 3,
    kind: 'produce',
    request: {buffer, deltaTime: 1, generation: 1, time: 1},
  })
  expect(response).toEqual({frame: {buffer, generation: 1, kind: 'stale'}, id: 3, kind: 'produced'})
})

test.each(['normal', 'cubism'] as const)(
  'should preserve %s expressions, channels, effects and both blend stages through checkpoint restore',
  (composition) => {
    const document: PuppetDocument = {
      ...source,
      breath: [{offset: 0.1, parameterId: 'q', peak: 0.3, period: 2, weight: 0.8}],
      expressions: [
        {
          composition: composition === 'cubism' ? 'cubism' : undefined,
          fadeInTime: 0.2,
          fadeOutTime: 0.4,
          id: 'smile',
          parameters: [{blend: 'add', parameterId: 'p', value: 0.4}],
        },
        {id: 'overlay', parameters: [{blend: 'multiply', parameterId: 'p', value: 1.5}]},
      ],
      look: [{parameterId: 'q', x: 0.3, xy: 0.2, y: 0.1}],
      motionParameterBase: 'previous-frame',
      motionParameterPrecision: 'float64',
      parameterRoles: {eyeBlink: ['p'], lipSync: ['q']},
    }
    const reference = createBufferEngine(document)
    const worker = createWasmWorker(new WebAssembly.Instance(module))
    expect(worker.process({audio: new Map(), document, id: 1, kind: 'initialize'}).kind).toBe(
      'initialized',
    )
    const initial = reference.step(0, new ArrayBuffer(reference.bytes)).state
    const state = {
      ...initial,
      adjustments: {
        ...initial.adjustments,
        blends: {
          'after-physics': new Map([['q', {mode: 'multiply' as const, value: 1.2, weight: 0.8}]]),
          'before-physics': new Map([['p', {mode: 'add' as const, value: 0.2, weight: 0.5}]]),
        },
      },
      expressionLayers: [
        {
          entries: [
            {expressionId: 'overlay', fading: 'in' as const, mode: 'stack' as const, progress: 0.4},
          ],
          id: 'gesture',
        },
      ],
      expressions: [{expressionId: 'smile', fading: 'in' as const, progress: 0.2}],
      eyeBlink: {phase: 'closing' as const, since: 0, time: 0.01},
      lipSyncLevel: 0.2,
      look: {
        breathTime: 0.2,
        lookPoint: {vx: 0.1, vy: 0.2, x: 0.1, y: 0.2},
        lookTarget: {x: 0.3, y: -0.2},
      },
      voiceTarget: {a: 0.3, e: 0.1, i: 0.2, o: 0.2, u: 0.2},
    }
    reference.reset(state, 3)
    expect(worker.process({generation: 1, id: 2, inputRevision: 3, kind: 'reset', state})).toEqual({
      id: 2,
      kind: 'reset',
    })
    const expected = reference.step(1 / 120, new ArrayBuffer(reference.bytes))
    const actual = expectFrame(
      worker.process({
        id: 3,
        kind: 'produce',
        request: {
          buffer: new ArrayBuffer(reference.bytes),
          deltaTime: 1 / 120,
          generation: 1,
          time: 1,
        },
      }),
    )
    expect(actual.state.frameValues.p).toBeCloseTo(expected.state.frameValues.p!, 10)
    expect(actual.state.frameValues.q).toBeCloseTo(expected.state.frameValues.q!, 10)
    expect(actual.state.look).toEqual(expected.state.look)
    expect(actual.state.eyeBlink).toEqual(expected.state.eyeBlink)
    expect(actual.state.expressions).toEqual(expected.state.expressions)
    expect(actual.state.expressionLayers).toEqual(expected.state.expressionLayers)
    expect(actual.state.mouth).toEqual(expected.state.mouth)
    expect(actual.inputRevision).toBe(3)
  },
)

test('should preserve completion order, notice acknowledgement and settled input revisions', () => {
  const document: PuppetDocument = {
    ...source,
    motions: [
      {
        ...source.motions[0]!,
        duration: 0.02,
        events: [{time: 0.01, value: 'finish'}],
        loop: false,
        tracks: [],
      },
    ],
  }
  const reference = createBufferEngine(document)
  const worker = createWasmWorker(new WebAssembly.Instance(module))
  expect(worker.process({audio: new Map(), document, id: 1, kind: 'initialize'})).toEqual({
    bytes: reference.bytes,
    id: 1,
    kind: 'initialized',
  })
  const initial = reference.step(0, new ArrayBuffer(reference.bytes)).state
  const state = {
    ...initial,
    additional: [
      {
        blend: 'add' as const,
        completion: 9,
        elapsed: 0,
        id: 4,
        loop: false,
        motionId: 'idle',
        priority: 1,
        speed: 1,
        status: 'playing' as const,
        stopping: undefined,
        time: 0,
        weight: 0.5,
      },
    ],
    playback: {...initial.playback, completion: 7},
  }
  const input = {revision: 4, settle: true, state}
  const expected = reference.step(0.03, new ArrayBuffer(reference.bytes), input)
  const actual = expectFrame(
    worker.process({
      id: 2,
      kind: 'produce',
      request: {
        buffer: new ArrayBuffer(reference.bytes),
        deltaTime: 0.03,
        generation: 0,
        input,
        time: 0.03,
      },
    }),
  )
  expect(actual.state).toEqual(expected.state)
  expect(actual.inputRevision).toBe(4)
  const accepted = expected.state.notices.sequence
  const next = expectFrame(
    worker.process({
      id: 3,
      kind: 'produce',
      request: {
        acknowledgedNotices: accepted,
        buffer: new ArrayBuffer(reference.bytes),
        deltaTime: 0.01,
        generation: 0,
        time: 0.04,
      },
    }),
  )
  expect(next.state.notices).toEqual({pending: [], sequence: accepted})
})

test('should analyze decoded motion audio and remove audio resources inside Wasm', () => {
  const samples = Float32Array.from({length: 1024}, (_, index) => Math.sin(index * 0.2) * 0.2)
  const sound = {channels: [samples], mono: samples, sampleRate: 8000}
  const audio = new Map([['voice.wav', sound]])
  const document: PuppetDocument = {
    ...source,
    motions: [{...source.motions[0]!, sound: {analysis: 'rms', src: 'voice.wav'}}],
    parameterRoles: {lipSync: ['q']},
  }
  const reference = createBufferEngine(document)
  reference.updateAudio(audio)
  const worker = createWasmWorker(new WebAssembly.Instance(module))
  expect(worker.process({audio, document, id: 1, kind: 'initialize'}).kind).toBe('initialized')
  const state = reference.step(0, new ArrayBuffer(reference.bytes)).state
  worker.process({generation: 1, id: 2, inputRevision: 0, kind: 'reset', state})
  const expected = reference.step(1 / 120, new ArrayBuffer(reference.bytes))
  const actual = expectFrame(
    worker.process({
      id: 3,
      kind: 'produce',
      request: {
        buffer: new ArrayBuffer(reference.bytes),
        deltaTime: 1 / 120,
        generation: 1,
        time: 0,
      },
    }),
  )
  expect(actual.state.frameValues.q).toBeCloseTo(expected.state.frameValues.q!, 10)
  expect(worker.process({id: 4, kind: 'audio', removed: ['voice.wav'], sounds: new Map()})).toEqual(
    {id: 4, kind: 'audio'},
  )
  reference.patchAudio(new Map(), ['voice.wav'])
  const silent = reference.step(1 / 120, new ArrayBuffer(reference.bytes))
  const removed = expectFrame(
    worker.process({
      id: 5,
      kind: 'produce',
      request: {
        buffer: new ArrayBuffer(reference.bytes),
        deltaTime: 1 / 120,
        generation: 1,
        time: 0,
      },
    }),
  )
  expect(removed.state.frameValues.q).toBeCloseTo(silent.state.frameValues.q!, 10)
})

test('should preserve fixed-step pendulum results for stiff springs', () => {
  const document: PuppetDocument = {
    ...source,
    physics: {pendulums: [{...source.physics!.pendulums[0]!, damping: 0, gravity: 1e6}]},
  }
  const reference = createBufferEngine(document)
  const worker = createWasmWorker(new WebAssembly.Instance(module))
  expect(worker.process({audio: new Map(), document, id: 1, kind: 'initialize'}).kind).toBe(
    'initialized',
  )
  const state = reference.step(0, new ArrayBuffer(reference.bytes)).state
  worker.process({generation: 1, id: 2, inputRevision: 0, kind: 'reset', state})
  const expected = reference.step(0.02, new ArrayBuffer(reference.bytes))
  const actual = expectFrame(
    worker.process({
      id: 3,
      kind: 'produce',
      request: {buffer: new ArrayBuffer(reference.bytes), deltaTime: 0.02, generation: 1, time: 0},
    }),
  )
  expect(actual.state.physicsState).toEqual(expected.state.physicsState)
})

test('should initialize and advance an empty model without a host checkpoint', () => {
  const document = createEmptyDocument()
  const reference = createBufferEngine(document)
  const expected = reference.step(1 / 120, new ArrayBuffer(0))
  const worker = createWasmWorker(new WebAssembly.Instance(module))
  expect(worker.process({audio: new Map(), document, id: 1, kind: 'initialize'})).toEqual({
    bytes: 0,
    id: 1,
    kind: 'initialized',
  })
  const actual = expectFrame(
    worker.process({
      id: 2,
      kind: 'produce',
      request: {buffer: new ArrayBuffer(0), deltaTime: 1 / 120, generation: 0, time: 0},
    }),
  )
  expect(actual.state).toEqual(expected.state)
})

test('should release the Wasm runtime once and reject use after destruction', () => {
  const worker = createWasmWorker(new WebAssembly.Instance(module))
  worker.destroy()
  worker.destroy()
  expect(() =>
    worker.process({audio: new Map(), document: createEmptyDocument(), id: 1, kind: 'initialize'}),
  ).toThrow('destroyed')
})

test.each(['direct', 'part', 'implicit'] as const)(
  'should preserve %s keyed Glue without scanning unrelated bindings per frame',
  (target) => {
    const keyed = {id: 'join', strength: 0.4, weight: 0.7}
    const document: PuppetDocument = {
      ...source,
      parameterBindings: [
        {
          id: 'glue-binding',
          keyforms: [
            {
              glue: target === 'direct' ? [{id: 'join', strength: 0.8, weight: 0.25}] : [],
              parts:
                target === 'direct'
                  ? []
                  : [
                      {
                        glue: [{id: 'join', strength: 0.8, weight: 0.25}],
                        partId: 'first',
                        vertices: [0, 0, 1, 0, 0, 1],
                      },
                    ],
              values: [0],
            },
            {
              glue: target === 'direct' ? [keyed] : [],
              parts:
                target === 'direct'
                  ? []
                  : [{glue: [keyed], partId: 'first', vertices: [0, 0, 1, 0, 0, 1]}],
              values: [1],
            },
          ],
          parameterIds: ['p'],
          targetGlueIds: target === 'direct' ? ['join'] : undefined,
          targetPartIds: target === 'part' ? ['first'] : undefined,
        },
      ],
      parts: [
        triangle('first'),
        {
          ...triangle('second'),
          mesh: {...triangle('second').mesh, vertices: [10, 0, 11, 0, 10, 1]},
        },
      ],
    }
    const reference = createBufferEngine(document)
    const worker = createWasmWorker(new WebAssembly.Instance(module))
    expect(worker.process({audio: new Map(), document, id: 1, kind: 'initialize'})).toEqual({
      bytes: reference.bytes,
      id: 1,
      kind: 'initialized',
    })
    const state = reference.step(0, new ArrayBuffer(reference.bytes)).state
    worker.process({generation: 1, id: 2, inputRevision: 0, kind: 'reset', state})
    const expected = reference.step(0.5, new ArrayBuffer(reference.bytes))
    const actual = expectFrame(
      worker.process({
        id: 3,
        kind: 'produce',
        request: {buffer: new ArrayBuffer(reference.bytes), deltaTime: 0.5, generation: 1, time: 0},
      }),
    )
    expect(actual.computed.vertices).toEqual(expected.computed.vertices)
  },
)

test('should add stacked expression offsets after multiplying the base value', () => {
  const document: PuppetDocument = {
    ...createEmptyDocument(),
    expressions: [
      {id: 'offset', parameters: [{blend: 'add', parameterId: 'p', value: 0.2}]},
      {id: 'scale', parameters: [{blend: 'multiply', parameterId: 'p', value: 2}]},
    ],
    parameters: [{defaultValue: 1, id: 'p', maximum: 10, minimum: 0, name: 'p'}],
  }
  const reference = createBufferEngine(document)
  const worker = createWasmWorker(new WebAssembly.Instance(module))
  worker.process({audio: new Map(), document, id: 1, kind: 'initialize'})
  const initial = reference.step(0, new ArrayBuffer(0)).state
  const state = {
    ...initial,
    expressions: ['offset', 'scale'].map((expressionId) => ({
      expressionId,
      fading: 'in' as const,
      mode: 'stack' as const,
      progress: 1,
    })),
  }
  reference.reset(state)
  worker.process({generation: 1, id: 2, inputRevision: 0, kind: 'reset', state})
  const expected = reference.step(0, new ArrayBuffer(0))
  const actual = expectFrame(
    worker.process({
      id: 3,
      kind: 'produce',
      request: {buffer: new ArrayBuffer(0), deltaTime: 0, generation: 1, time: 0},
    }),
  )
  expect(actual.state.frameValues.p).toBe(expected.state.frameValues.p)
})

test('should preserve an unchanged empty motion history in previous-frame mode', () => {
  const document: PuppetDocument = {
    ...createEmptyDocument(),
    motionParameterBase: 'previous-frame',
    parameters: [{defaultValue: 1, id: 'p', maximum: 10, minimum: 0, name: 'p'}],
  }
  const reference = createBufferEngine(document)
  const worker = createWasmWorker(new WebAssembly.Instance(module))
  worker.process({audio: new Map(), document, id: 1, kind: 'initialize'})
  const state = reference.step(0, new ArrayBuffer(0)).state
  worker.process({generation: 1, id: 2, inputRevision: 0, kind: 'reset', state})
  const actual = expectFrame(
    worker.process({
      id: 3,
      kind: 'produce',
      request: {buffer: new ArrayBuffer(0), deltaTime: 0, generation: 1, time: 0},
    }),
  )
  expect(actual.state.history).toEqual(state.history)
})

test('should retain history frame metadata when only paused playback speed changes', () => {
  const document: PuppetDocument = {...source, motionParameterBase: 'previous-frame'}
  const reference = createBufferEngine(document)
  const worker = createWasmWorker(new WebAssembly.Instance(module))
  worker.process({audio: new Map(), document, id: 1, kind: 'initialize'})
  const initial = reference.step(0, new ArrayBuffer(reference.bytes)).state
  const state = {...initial, playback: {...initial.playback, speed: 0}}
  reference.reset(state)
  worker.process({generation: 1, id: 2, inputRevision: 0, kind: 'reset', state})
  const expected = reference.step(0, new ArrayBuffer(reference.bytes))
  const actual = expectFrame(
    worker.process({
      id: 3,
      kind: 'produce',
      request: {buffer: new ArrayBuffer(reference.bytes), deltaTime: 0, generation: 1, time: 0},
    }),
  )
  expect(actual.state.history).toEqual(expected.state.history)
})

test('should preserve own optional fields through the host checkpoint round trip', () => {
  const reference = createBufferEngine(source)
  const worker = createWasmWorker(new WebAssembly.Instance(module))
  worker.process({audio: new Map(), document: source, id: 1, kind: 'initialize'})
  const state = reference.step(0, new ArrayBuffer(reference.bytes)).state
  worker.process({generation: 1, id: 2, inputRevision: 0, kind: 'reset', state})
  const expected = reference.step(0.5, new ArrayBuffer(reference.bytes))
  const actual = expectFrame(
    worker.process({
      id: 3,
      kind: 'produce',
      request: {buffer: new ArrayBuffer(reference.bytes), deltaTime: 0.5, generation: 1, time: 0},
    }),
  )
  expect(actual.state.look).toStrictEqual(expected.state.look)
  expect(actual.state.playback).toStrictEqual(expected.state.playback)
  expect(Object.hasOwn(actual.state, 'lipSyncLevel')).toBe(true)
  expect(actual.state.lipSyncLevel).toBeUndefined()
  reference.reset(actual.state)
  expect(reference.step(0.01, new ArrayBuffer(reference.bytes)).state.frameValues.p).toBeCloseTo(
    0.51,
    10,
  )
})
