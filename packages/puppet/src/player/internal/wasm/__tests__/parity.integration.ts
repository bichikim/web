import {createRequire} from 'node:module'
import {readFileSync, writeFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {expect, test, vi} from 'vitest'
import {parseDocumentBlob} from '../../../parse-document-blob'
import {createBufferEngine} from '../../../buffering/create-buffer-engine'
import {createWasmWorker} from '../create-worker'

vi.mock('brotli-wasm', () => ({
  default: Promise.resolve(createRequire(import.meta.url)('brotli-wasm')),
}))

const module = new WebAssembly.Module(readFileSync(resolve(import.meta.dirname, '../runtime.wasm')))
const difference = (first: unknown, second: unknown, path = ''): string | undefined => {
  if (typeof first === 'number' && typeof second === 'number') {
    return Math.abs(first - second) <= 1e-8 * Math.max(1, Math.abs(first), Math.abs(second))
      ? undefined
      : `${path}: ${first} != ${second}`
  }
  if (first instanceof Map && second instanceof Map) {
    if (first.size !== second.size) {
      return `${path}.size`
    }
    for (const [key, value] of first) {
      if (!second.has(key)) {
        return `${path}.missing(${key})`
      }
      const found = difference(value, second.get(key), `${path}.${key}`)
      if (found !== undefined) {
        return found
      }
    }
    return undefined
  }
  if (
    typeof first === 'object' &&
    first !== null &&
    typeof second === 'object' &&
    second !== null
  ) {
    const entries = Object.entries(first)
    const other = new Map(Object.entries(second))
    for (const [key, value] of entries) {
      const found = difference(value, other.get(key), `${path}.${key}`)
      if (found !== undefined) {
        return found
      }
      other.delete(key)
    }
    return [...other].find(([, value]) => value !== undefined)?.[0]
  }
  return first === second ? undefined : `${path}: ${String(first)} != ${String(second)}`
}
const models = [resolve(import.meta.dirname, '../../../../../examples/development-model.json')]
if (process.env.MODEL !== undefined) {
  models.push(process.env.MODEL)
}
test.each(models)(
  'should preserve complete playback and checkpoint results for %s',
  async (path) => {
    const parsed = await parseDocumentBlob({source: new Blob([new Uint8Array(readFileSync(path))])})
    if (!parsed.ok) {
      throw new Error(`Invalid model ${path}`)
    }
    const document = {
      ...parsed.document,
      parts: parsed.document.parts.map((part) => ({...part, texture: {...part.texture, src: ''}})),
      textureAssets: undefined,
    }
    const reference = createBufferEngine(document)
    const instance = new WebAssembly.Instance(module)
    const worker = createWasmWorker(instance)
    const initializeStart = process.hrtime.bigint()
    expect(worker.process({audio: new Map(), document, id: 1, kind: 'initialize'})).toEqual({
      bytes: reference.bytes,
      id: 1,
      kind: 'initialized',
    })
    const initializeMillis = Number(process.hrtime.bigint() - initializeStart) / 1_000_000
    const state = reference.step(0, new ArrayBuffer(reference.bytes)).state
    expect(worker.process({generation: 1, id: 2, inputRevision: 0, kind: 'reset', state})).toEqual({
      id: 2,
      kind: 'reset',
    })
    const computeStart = process.hrtime.bigint()
    let maximumVertexError = 0
    let maximumQuantization = 0
    const frames = Number(process.env.FRAMES ?? 120)
    for (let index = 0; index < frames; index += 1) {
      const expected = reference.step(1 / 120, new ArrayBuffer(reference.bytes))
      const response = worker.process({
        id: index + 3,
        kind: 'produce',
        request: {
          buffer: new ArrayBuffer(reference.bytes),
          deltaTime: 1 / 120,
          generation: 1,
          time: index / 120,
        },
      })
      if (response.kind !== 'produced' || response.frame.kind !== 'frame') {
        throw new Error(JSON.stringify(response))
      }
      const actual = response.frame
      expect(difference(expected.state, actual.state), `state at frame ${index}`).toBeUndefined()
      expect(
        difference(expected.computed.frame, actual.computed.frame),
        `plan at frame ${index}`,
      ).toBeUndefined()
      expect(actual.playback).toEqual(expected.playback)
      for (const [vertex, value] of expected.computed.vertices.entries()) {
        const other = actual.computed.vertices[vertex]!
        const error = Math.abs(value - other)
        maximumVertexError = Math.max(maximumVertexError, error)
        const step =
          2 ** (Math.floor(Math.log2(Math.max(Math.abs(value), Math.abs(other), 2 ** -126))) - 23)
        maximumQuantization = Math.max(maximumQuantization, error / step)
      }
    }
    const computeMillis = Number(process.hrtime.bigint() - computeStart) / 1_000_000
    expect(maximumQuantization).toBeLessThanOrEqual(1)
    if (process.env.PARITY_OUTPUT !== undefined) {
      writeFileSync(
        process.env.PARITY_OUTPUT,
        JSON.stringify(
          {
            computeMillis,
            frames,
            initializeMillis,
            maximumQuantization,
            maximumVertexError,
            memoryBytes:
              instance.exports.memory instanceof WebAssembly.Memory
                ? instance.exports.memory.buffer.byteLength
                : 0,
            model: path,
          },
          null,
          2,
        ),
      )
    }
    worker.destroy()
  },
  120_000,
)
