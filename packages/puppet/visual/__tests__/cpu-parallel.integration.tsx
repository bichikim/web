import {expect, test} from 'vitest'
import runtimeUrl from '../../src/player/internal/wasm/runtime.wasm?url'
import {preparePuppetDocument} from '../../src/player/prepare-puppet-document'
import {createWasmWorker} from '../../src/player/internal/wasm/create-worker'
import {createBufferEngine} from '../../src/player/buffering/create-buffer-engine'
import type {BufferRequest, PackedBufferResponse} from '../../src/player/buffering/types'

interface PendingResponse {
  resolve: (response: PackedBufferResponse) => void
  reject: (cause: Error) => void
}

const model = import.meta.env.VITE_PUPPET_MODEL
const threadedTest = test.skipIf(
  !crossOriginIsolated || navigator.hardwareConcurrency < 4 || model === undefined,
)
threadedTest(
  'should evaluate actual model states with shared-memory CPU threads and exact serial coordinates',
  async () => {
    const parsed = await preparePuppetDocument({
      source: await (await fetch(`/@fs/${model}`)).blob(),
    })
    if (!parsed.ok) {
      throw new Error('Invalid model')
    }
    const document = {
      ...parsed.document,
      parts: parsed.document.parts.map((p) => ({...p, texture: {...p.texture, src: ''}})),
      textureAssets: undefined,
    }
    const serial = createWasmWorker(
      new WebAssembly.Instance(
        await WebAssembly.compile(await (await fetch(runtimeUrl)).arrayBuffer()),
      ),
    )
    const worker = new Worker(
      new URL('../../src/player/buffering/rust-worker.ts', import.meta.url),
      {type: 'module'},
    )
    const pending = new Map<number, PendingResponse>()
    worker.onmessage = ({data}: MessageEvent<PackedBufferResponse>) => {
      const request = pending.get(data.id)
      if (request !== undefined) {
        pending.delete(data.id)
        if (data.kind === 'error') {
          request.reject(Error(data.message))
        } else {
          request.resolve(data)
        }
      }
    }
    worker.onerror = (e) => pending.forEach((p) => p.reject(Error(e.message)))
    const send = (data: BufferRequest) =>
      new Promise<PackedBufferResponse>((resolve, reject) => {
        pending.set(data.id, {reject, resolve})
        worker.postMessage(data)
      })
    try {
      serial.process({audio: new Map(), document, id: 1, kind: 'initialize'})
      const ready = await send({audio: new Map(), document, id: 1, kind: 'initialize'})
      expect(ready).toMatchObject({kind: 'initialized', threads: 2})
      const engine = createBufferEngine(document)
      const initial = engine.step(0, new ArrayBuffer(engine.bytes)).state
      const cases = [
        {},
        ...(document.parameters ?? []).flatMap((p) =>
          [p.minimum, p.maximum].map((v) => ({[p.id]: v})),
        ),
        ...(document.expressions ?? []).map((e) =>
          Object.fromEntries(e.parameters.map((p) => [p.parameterId, p.value])),
        ),
      ]
      for (const [index, values] of cases.entries()) {
        const generation = index + 1
        const state = {...initial, parameterValues: {...initial.parameterValues, ...values}}
        const reset: BufferRequest = {generation, id: 2, inputRevision: 0, kind: 'reset', state}
        serial.process(reset)
        // eslint-disable-next-line no-await-in-loop -- Restore the same deterministic checkpoint in both runtimes.
        await send(reset)
        const message: BufferRequest = {
          id: 3,
          kind: 'produce',
          request: {buffer: new ArrayBuffer(engine.bytes), deltaTime: 0, generation, time: 0},
        }
        const expected = serial.process(message)
        // eslint-disable-next-line no-await-in-loop -- Verify each real thread result before reusing its simulation checkpoint.
        const actual = await send(message)
        if (
          expected.kind !== 'produced' ||
          expected.frame.kind !== 'frame' ||
          actual.kind !== 'produced' ||
          actual.frame.kind !== 'frame'
        ) {
          throw new Error('Missing frame')
        }
        const a = new Uint32Array(actual.frame.computed.vertices.buffer)
        const b = new Uint32Array(expected.frame.computed.vertices.buffer)
        expect(a.length, `scenario ${index} vertex count`).toBe(b.length)
        expect(
          a.findIndex((word, i) => word !== b[i]),
          `scenario ${index}`,
        ).toBe(-1)
      }
      console.warn(JSON.stringify({cpuThreads: 2, exactCases: cases.length}))
    } finally {
      serial.destroy()
      worker.terminate()
    }
  },
  120000,
)
