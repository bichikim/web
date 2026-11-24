import {readFileSync, writeFileSync} from 'node:fs'
import {createRequire} from 'node:module'
import {resolve} from 'node:path'
import {expect, test, vi} from 'vitest'
import {createBufferEngine} from '../../../buffering/create-buffer-engine'
import {parseDocumentBlob} from '../../../parse-document-blob'
import {createWasmWorker} from '../create-worker'

vi.mock('brotli-wasm', () => ({
  default: Promise.resolve(createRequire(import.meta.url)('brotli-wasm')),
}))

test.runIf(process.env.MODEL !== undefined)(
  'should preserve attachments across every parameter endpoint of the actual model',
  async () => {
    const parsed = await parseDocumentBlob({
      source: new Blob([new Uint8Array(readFileSync(process.env.MODEL!))]),
    })
    if (!parsed.ok) {
      throw new Error('Invalid model')
    }
    const document = {
      ...parsed.document,
      parts: parsed.document.parts.map((part) => ({...part, texture: {...part.texture, src: ''}})),
      textureAssets: undefined,
    }
    if (document.parameters === undefined) {
      throw new Error('Ash parity fixture has no parameters')
    }
    const reference = createBufferEngine(document)
    const module = new WebAssembly.Module(
      readFileSync(resolve(import.meta.dirname, '../runtime.wasm')),
    )
    const worker = createWasmWorker(new WebAssembly.Instance(module))
    const baselinePath = process.env.PARITY_BASELINE
    const baseline =
      baselinePath === undefined
        ? undefined
        : createWasmWorker(
            new WebAssembly.Instance(new WebAssembly.Module(readFileSync(baselinePath))),
          )
    const cases = [
      {name: 'default', values: {}},
      ...document.parameters.flatMap((parameter) =>
        [parameter.minimum, parameter.maximum].map((value) => ({
          name: `${parameter.id}=${value}`,
          values: {[parameter.id]: value},
        })),
      ),
      ...(document.expressions ?? []).map((expression) => ({
        name: expression.id,
        values: Object.fromEntries(
          expression.parameters.map((parameter) => [parameter.parameterId, parameter.value]),
        ),
      })),
    ]
    let maximumVertexError = 0
    let maximumQuantization = 0
    let worstCase = ''
    try {
      worker.process({audio: new Map(), document, id: 1, kind: 'initialize'})
      baseline?.process({audio: new Map(), document, id: 1, kind: 'initialize'})
      const state = reference.step(0, new ArrayBuffer(reference.bytes)).state
      for (const [index, scenario] of cases.entries()) {
        const checkpoint = {
          ...state,
          parameterValues: {...state.parameterValues, ...scenario.values},
        }
        reference.reset(checkpoint)
        const reset = {
          generation: index + 1,
          id: index * 2 + 2,
          inputRevision: 0,
          kind: 'reset' as const,
          state: checkpoint,
        }
        worker.process(reset)
        baseline?.process(reset)
        const expected = reference.step(0, new ArrayBuffer(reference.bytes))
        const request = {
          id: index * 2 + 3,
          kind: 'produce' as const,
          request: {
            buffer: new ArrayBuffer(reference.bytes),
            deltaTime: 0,
            generation: index + 1,
            time: 0,
          },
        }
        const actual = worker.process(request)
        if (actual.kind !== 'produced' || actual.frame.kind !== 'frame') {
          throw new Error(JSON.stringify(actual))
        }
        const previous = baseline?.process({
          ...request,
          request: {...request.request, buffer: new ArrayBuffer(reference.bytes)},
        })
        if (previous !== undefined) {
          if (previous.kind !== 'produced' || previous.frame.kind !== 'frame') {
            throw new Error(JSON.stringify(previous))
          }
          const vertices = actual.frame.computed.vertices
          const original = previous.frame.computed.vertices
          expect(vertices.buffer).not.toBe(original.buffer)
          expect(
            Buffer.compare(
              new Uint8Array(vertices.buffer, vertices.byteOffset, vertices.byteLength),
              new Uint8Array(original.buffer, original.byteOffset, original.byteLength),
            ),
            scenario.name,
          ).toBe(0)
          expect(actual.frame.computed.frame, scenario.name).toEqual(previous.frame.computed.frame)
          expect(actual.frame.state, scenario.name).toEqual(previous.frame.state)
          expect(actual.frame.playback, scenario.name).toEqual(previous.frame.playback)
        }
        expect(actual.frame.computed.vertices.length).toBe(expected.computed.vertices.length)
        for (const [offset, value] of expected.computed.vertices.entries()) {
          const other = actual.frame.computed.vertices[offset]!
          const error = Math.abs(value - other)
          const step =
            2 ** (Math.floor(Math.log2(Math.max(Math.abs(value), Math.abs(other), 2 ** -126))) - 23)
          if (error > maximumVertexError) {
            worstCase = `${scenario.name} at coordinate ${offset}: ${value} != ${other}`
          }
          maximumVertexError = Math.max(maximumVertexError, error)
          maximumQuantization = Math.max(maximumQuantization, error / step)
        }
      }
      const report = {
        baselineCases: baseline === undefined ? 0 : cases.length,
        cases: cases.length,
        glueModes: document.glue?.reduce<Record<string, number>>(
          (counts, glue) => ({
            ...counts,
            [glue.mode ?? 'vertex']: (counts[glue.mode ?? 'vertex'] ?? 0) + 1,
          }),
          {},
        ),
        maximumQuantization,
        maximumVertexError,
        parameters: document.parameters.map((parameter) => ({
          id: parameter.id,
          name: parameter.name,
        })),
        worstCase,
      }
      if (process.env.PARITY_OUTPUT !== undefined) {
        writeFileSync(process.env.PARITY_OUTPUT, JSON.stringify(report, null, 2))
      }
      expect(maximumVertexError, worstCase).toBeLessThanOrEqual(0.001)
      expect(maximumQuantization, worstCase).toBeLessThanOrEqual(1)
    } finally {
      baseline?.destroy()
      worker.destroy()
    }
  },
  120_000,
)
