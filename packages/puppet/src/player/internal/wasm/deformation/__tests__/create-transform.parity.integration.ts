import {createRequire} from 'node:module'
import {readFileSync, writeFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {expect, test, vi} from 'vitest'
import {createBufferEngine} from '../../../../buffering/create-buffer-engine'
import {parseDocumentBlob} from '../../../../parse-document-blob'
import {createWasmTransform} from '../create-transform'

vi.mock('brotli-wasm', () => ({
  default: Promise.resolve(createRequire(import.meta.url)('brotli-wasm')),
}))

const module = new WebAssembly.Module(readFileSync(resolve(import.meta.dirname, '../kernel.wasm')))
const models = [resolve(import.meta.dirname, '../../../../../../examples/development-model.json')]
if (process.env.MODEL !== undefined) {
  models.push(process.env.MODEL)
}
test.each(models)(
  'should preserve buffered state, render plans and vertices for %s',
  async (path) => {
    const parsed = await parseDocumentBlob({source: new Blob([new Uint8Array(readFileSync(path))])})
    if (!parsed.ok) {
      throw new Error('Invalid model')
    }
    const document = {
      ...parsed.document,
      parts: parsed.document.parts.map((part) => ({...part, texture: {...part.texture, src: ''}})),
      textureAssets: undefined,
    }
    const instance = new WebAssembly.Instance(module)
    const mapVertices = instance.exports.map_vertices
    if (typeof mapVertices !== 'function') {
      throw new Error('Missing native mapper')
    }
    let nativeCalls = 0
    const factory = createWasmTransform(document, {
      exports: {
        ...instance.exports,
        map_vertices: (...args: number[]) => {
          nativeCalls += 1
          return mapVertices(...args)
        },
      },
    })
    if (path === process.env.MODEL) {
      expect(factory).toBeDefined()
    }
    const reference = createBufferEngine(document)
    const hybrid = createBufferEngine(document, factory)
    const frames = Number(process.env.FRAMES ?? 120)
    let differentWords = 0
    let maximumVertexError = 0
    for (let index = 0; index < frames; index += 1) {
      const expected = reference.step(1 / 120, new ArrayBuffer(reference.bytes))
      const actual = hybrid.step(1 / 120, new ArrayBuffer(hybrid.bytes))
      expect(actual.state).toEqual(expected.state)
      expect(actual.computed.frame).toEqual(expected.computed.frame)
      expect(actual.playback).toEqual(expected.playback)
      const expectedBits = new Uint32Array(expected.computed.vertices.buffer)
      const actualBits = new Uint32Array(actual.computed.vertices.buffer)
      for (let word = 0; word < expectedBits.length; word += 1) {
        if (expectedBits[word] !== actualBits[word]) {
          differentWords += 1
        }
        maximumVertexError = Math.max(
          maximumVertexError,
          Math.abs(expected.computed.vertices[word]! - actual.computed.vertices[word]!),
        )
      }
    }
    expect(differentWords).toBe(0)
    if (path === process.env.MODEL) {
      expect(nativeCalls).toBeGreaterThan(0)
    }
    const report = {
      differentWords,
      frames,
      maximumVertexError,
      memoryBytes:
        instance.exports.memory instanceof WebAssembly.Memory
          ? instance.exports.memory.buffer.byteLength
          : 0,
      model: path,
      nativeCalls,
      wasm: nativeCalls > 0,
    }
    if (process.env.PARITY_OUTPUT !== undefined && path === process.env.MODEL) {
      writeFileSync(process.env.PARITY_OUTPUT, JSON.stringify(report, null, 2))
    }
  },
  120_000,
)
