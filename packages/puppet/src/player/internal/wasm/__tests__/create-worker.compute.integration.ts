import {createRequire} from 'node:module'
import {readFileSync, writeFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {expect, test, vi} from 'vitest'
import {parseDocumentBlob} from '../../../parse-document-blob'
import {createBufferEngine} from '../../../buffering/create-buffer-engine'
import {createWasmWorker} from '../create-worker'
import {createWasmTransform} from '../deformation/create-transform'

vi.mock('brotli-wasm', () => ({
  default: Promise.resolve(createRequire(import.meta.url)('brotli-wasm')),
}))

test.skipIf(process.env.MODEL === undefined)(
  'should measure full runtime and boundary work with matching playback',
  async () => {
    const path = process.env.MODEL
    if (path === undefined) {
      throw new Error('MODEL is required')
    }
    const parsed = await parseDocumentBlob({source: new Blob([new Uint8Array(readFileSync(path))])})
    if (!parsed.ok) {
      throw new Error('Invalid model')
    }
    const document = {
      ...parsed.document,
      parts: parsed.document.parts.map((part) => ({...part, texture: {...part.texture, src: ''}})),
      textureAssets: undefined,
    }
    const frames = Number(process.env.FRAMES ?? 120)
    const warmup = 60
    const deltaTime = 1 / 120
    const clock = () => process.hrtime.bigint()
    const elapsed = (start: bigint) => Number(clock() - start) / 1_000_000
    const results = []
    const reference = createBufferEngine(document)
    let expected
    const referenceStart = clock()
    for (let index = 0; index < warmup; index += 1) {
      reference.step(deltaTime, new ArrayBuffer(reference.bytes))
    }
    const referenceMeasured = clock()
    for (let index = 0; index < frames; index += 1) {
      expected = reference.step(deltaTime, new ArrayBuffer(reference.bytes))
    }
    results.push({
      millisecondsPerFrame: elapsed(referenceMeasured) / frames,
      mode: 'js',
      totalMillis: elapsed(referenceStart),
    })
    const module = new WebAssembly.Module(
      readFileSync(resolve(import.meta.dirname, '../runtime.wasm')),
    )
    const original = new WebAssembly.Instance(module)
    const calls = new Map<string, number>()
    let active = false
    let requestBytes = 0
    let metadataBytes = 0
    const instrument = (original: WebAssembly.Instance) => ({
      exports: Object.fromEntries(
        Object.entries(original.exports).map(([name, value]) => [
          name,
          typeof value === 'function'
            ? (...args: number[]) => {
                const start = clock()
                const result: unknown = value(...args)
                if (active) {
                  calls.set(name, (calls.get(name) ?? 0) + elapsed(start))
                  if (name === 'worker_input') {
                    requestBytes += args[1] ?? 0
                  }
                  if (name === 'worker_output_length' && typeof result === 'number') {
                    metadataBytes += result
                  }
                }
                return result
              }
            : value,
        ]),
      ),
    })
    const instance = instrument(original)
    const {exports} = instance
    const worker = createWasmWorker(instance)
    expect(worker.process({audio: new Map(), document, id: 1, kind: 'initialize'}).kind).toBe(
      'initialized',
    )
    const advance = (index: number) =>
      worker.process({
        id: index + 2,
        kind: 'produce',
        request: {
          buffer: new ArrayBuffer(reference.bytes),
          deltaTime,
          generation: 0,
          time: index * deltaTime,
        },
      })
    for (let index = 0; index < warmup; index += 1) {
      advance(index)
    }
    active = true
    const measured = clock()
    let actual
    for (let index = 0; index < frames; index += 1) {
      actual = advance(index + warmup)
    }
    const totalMillis = elapsed(measured)
    active = false
    const nativeMillis = [...calls.values()].reduce((sum, value) => sum + value, 0)
    results.push({
      javascriptMillisPerFrame: (totalMillis - nativeMillis) / frames,
      linearMemoryBytes:
        exports.memory instanceof WebAssembly.Memory ? exports.memory.buffer.byteLength : 0,
      metadataBytesPerFrame: metadataBytes / frames,
      millisecondsPerFrame: totalMillis / frames,
      mode: 'full',
      nativeCallsMillisPerFrame: Object.fromEntries(
        [...calls].map(([name, value]) => [name, value / frames]),
      ),
      nativeMillisPerFrame: nativeMillis / frames,
      requestBytesPerFrame: requestBytes / frames,
    })
    if (actual?.kind !== 'produced' || actual.frame.kind !== 'frame' || expected === undefined) {
      throw new Error('Missing benchmark frame')
    }
    expect(actual.frame.playback).toEqual(expected.playback)
    for (const [id, value] of Object.entries(expected.state.frameValues)) {
      expect(actual.frame.state.frameValues[id]).toBeCloseTo(value, 7)
    }
    calls.clear()
    const kernel = new WebAssembly.Module(
      readFileSync(resolve(import.meta.dirname, '../deformation/kernel.wasm')),
    )
    const hybridInstance = instrument(new WebAssembly.Instance(kernel))
    const factory = createWasmTransform(document, hybridInstance)
    expect(factory).toBeDefined()
    const hybrid = createBufferEngine(document, factory)
    for (let index = 0; index < warmup; index += 1) {
      hybrid.step(deltaTime, new ArrayBuffer(hybrid.bytes))
    }
    active = true
    const hybridStart = clock()
    let hybridFrame
    for (let index = 0; index < frames; index += 1) {
      hybridFrame = hybrid.step(deltaTime, new ArrayBuffer(hybrid.bytes))
    }
    const hybridMillis = elapsed(hybridStart)
    active = false
    const hybridNative = [...calls.values()].reduce((sum, value) => sum + value, 0)
    results.push({
      javascriptMillisPerFrame: (hybridMillis - hybridNative) / frames,
      linearMemoryBytes:
        hybridInstance.exports.memory instanceof WebAssembly.Memory
          ? hybridInstance.exports.memory.buffer.byteLength
          : 0,
      millisecondsPerFrame: hybridMillis / frames,
      mode: 'hybrid',
      nativeCallsMillisPerFrame: Object.fromEntries(
        [...calls].map(([name, value]) => [name, value / frames]),
      ),
      nativeMillisPerFrame: hybridNative / frames,
    })
    expect(calls.get('map_vertices')).toBeGreaterThan(0)
    expect(hybridFrame?.playback).toEqual(expected.playback)
    if (process.env.BOUNDARY_OUTPUT !== undefined) {
      writeFileSync(
        process.env.BOUNDARY_OUTPUT,
        JSON.stringify({frames, model: path, results, warmup}, null, 2),
      )
    }
    worker.destroy()
  },
  120_000,
)
