import type {BufferResponse} from '../../src/player/buffering/types'
import {expect, test} from 'vitest'
import runtimeUrl from '../../src/player/internal/wasm/runtime.wasm?url'
import {createWasmWorker, type WasmWorker} from '../../src/player/internal/wasm/create-worker'
import {createBufferEngine} from '../../src/player/buffering/create-buffer-engine'
import {preparePuppetDocument} from '../../src/player/prepare-puppet-document'
import initialize, {GeometryKernel} from '../../src/player/rendering/wgpu/wasm/runtime'

const readFrame = (response: BufferResponse) => {
  if (response.kind !== 'produced' || response.frame.kind !== 'frame') {
    throw new Error('Missing numerical frame')
  }
  return response.frame
}
interface DeviceStats {
  frames: number
  vertices: number
  corrections: number
  overflow: number
}
const completeGeometry = async (
  worker: WasmWorker,
  kernel: GeometryKernel,
  points: Float32Array,
  stats: DeviceStats,
) => {
  const batch = worker.geometry!.take()
  if (batch === undefined) {
    return
  }
  let output = points
  let indices: Uint32Array = new Uint32Array()
  let all = false
  if (batch.commands.length > 0) {
    output = await kernel.evaluate(points, batch.commands, batch.values)
    indices = kernel.corrections()
    all = kernel.overflow()
    stats.frames += 1
    stats.vertices += batch.commands.reduce(
      (sum, value, index) => sum + (index % 4 === 1 ? value : 0),
      0,
    )
    stats.corrections += indices.length
    stats.overflow += Number(all)
  }
  worker.geometry!.finish(batch.id, output, indices, all)
  points.set(output)
}
const compareCoordinates = (actual: Float32Array, expected: Float32Array, name: string) => {
  const bits = new Uint32Array(actual.buffer)
  const reference = new Uint32Array(expected.buffer)
  const first = bits.findIndex((value, index) => value !== reference[index])
  expect(
    first,
    `${name}, first=${first}, actual=${actual[first]}, expected=${expected[first]}`,
  ).toBe(-1)
}
const model = import.meta.env.VITE_PUPPET_MODEL
const adapter = await navigator.gpu?.requestAdapter()
const gpuTest = test.skipIf(adapter === null || adapter === undefined || model === undefined)
gpuTest(
  'should preserve actual model states after GPU geometry, corrections and CPU glue',
  async () => {
    const parsed = await preparePuppetDocument({
      source: await (await fetch(`/@fs/${model}`)).blob(),
    })
    if (!parsed.ok) {
      throw new Error('Invalid model')
    }
    const document = {
      ...parsed.document,
      parts: parsed.document.parts.map((part) => ({...part, texture: {...part.texture, src: ''}})),
      textureAssets: undefined,
    }
    const module = await WebAssembly.compile(await (await fetch(runtimeUrl)).arrayBuffer())
    const cpu = createWasmWorker(new WebAssembly.Instance(module))
    const gpu = createWasmWorker(new WebAssembly.Instance(module))
    await initialize()
    const kernel = await GeometryKernel.create()
    const scenarios = [
      {name: 'default', values: {}},
      ...(document.parameters ?? []).flatMap((parameter) =>
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
    const stats: DeviceStats = {corrections: 0, frames: 0, overflow: 0, vertices: 0}
    try {
      cpu.process({audio: new Map(), document, id: 1, kind: 'initialize'})
      gpu.process({audio: new Map(), deferGeometry: true, document, id: 1, kind: 'initialize'})
      const engine = createBufferEngine(document)
      const initial = engine.step(0, new ArrayBuffer(engine.bytes)).state
      for (const [index, scenario] of scenarios.entries()) {
        const state = {
          ...initial,
          parameterValues: {...initial.parameterValues, ...scenario.values},
        }
        const reset = {
          generation: index + 1,
          id: 2,
          inputRevision: 0,
          kind: 'reset' as const,
          state,
        }
        cpu.process(reset)
        gpu.process(reset)
        const request = {
          id: 3,
          kind: 'produce' as const,
          request: {
            buffer: new ArrayBuffer(engine.bytes),
            deltaTime: 0,
            generation: index + 1,
            time: 0,
          },
        }
        const expected = cpu.process(request)
        const actual = gpu.process({
          ...request,
          request: {...request.request, buffer: new ArrayBuffer(engine.bytes)},
        })
        const expectedFrame = readFrame(expected)
        const actualFrame = readFrame(actual)
        // eslint-disable-next-line no-await-in-loop -- Each result populates the next native pose cache.
        await completeGeometry(gpu, kernel, actualFrame.computed.vertices, stats)
        compareCoordinates(
          actualFrame.computed.vertices,
          expectedFrame.computed.vertices,
          scenario.name,
        )
        expect(actualFrame.state, scenario.name).toEqual(expectedFrame.state)
        expect(actualFrame.computed.frame, scenario.name).toEqual(expectedFrame.computed.frame)
      }
      const snapshots = []
      for (const [index, value] of [-23, 19, 7].entries()) {
        const state = {
          ...initial,
          parameterValues: {
            ...initial.parameterValues,
            ParamAngleX: value,
            ParamAngleY: value * 0.3,
            ParamBodyAngleX: value * 0.2,
          },
        }
        const reset = {
          generation: 1000 + index,
          id: 4,
          inputRevision: 0,
          kind: 'reset' as const,
          state,
        }
        cpu.process(reset)
        gpu.process(reset)
        const request = {
          id: 5,
          kind: 'produce' as const,
          request: {
            buffer: new ArrayBuffer(engine.bytes),
            deltaTime: 0,
            generation: 1000 + index,
            time: 0,
          },
        }
        const expected = cpu.process(request)
        const actual = gpu.process({
          ...request,
          request: {...request.request, buffer: new ArrayBuffer(engine.bytes)},
        })
        const expectedFrame = readFrame(expected)
        const actualFrame = readFrame(actual)
        const batch = gpu.geometry!.take()
        if (batch === undefined) {
          throw new Error('Missing owned geometry')
        }
        snapshots.push({actual: actualFrame, batch, expected: expectedFrame})
      }
      for (const index of [2, 0, 1]) {
        const {expected, actual, batch} = snapshots[index]!
        // eslint-disable-next-line no-await-in-loop -- Completions deliberately arrive in a different order from simulation.
        const vertices = await kernel.evaluate(
          actual.computed.vertices,
          batch.commands,
          batch.values,
        )
        gpu.geometry!.finish(batch.id, vertices, kernel.corrections(), kernel.overflow())
        expect(new Uint32Array(vertices.buffer), `pipeline frame ${index}`).toEqual(
          new Uint32Array(expected.computed.vertices.buffer),
        )
      }
      const request = {
        id: 6,
        kind: 'produce' as const,
        request: {buffer: new ArrayBuffer(engine.bytes), deltaTime: 0, generation: 1002, time: 0},
      }
      const expected = cpu.process(request)
      const actual = gpu.process({
        ...request,
        request: {...request.request, buffer: new ArrayBuffer(engine.bytes)},
      })
      const expectedFrame = readFrame(expected)
      const actualFrame = readFrame(actual)
      const batch = gpu.geometry!.take()
      if (batch !== undefined) {
        // eslint-disable-next-line no-await-in-loop -- Completions deliberately arrive in a different order from simulation.
        const vertices = await kernel.evaluate(
          actualFrame.computed.vertices,
          batch.commands,
          batch.values,
        )
        gpu.geometry!.finish(batch.id, vertices, kernel.corrections(), kernel.overflow())
        actualFrame.computed.vertices.set(vertices)
      }
      expect(
        new Uint32Array(actualFrame.computed.vertices.buffer),
        'late completion cache',
      ).toEqual(new Uint32Array(expectedFrame.computed.vertices.buffer))
      const fallbackState = {
        ...initial,
        parameterValues: {
          ...initial.parameterValues,
          ParamAngleX: 16.5,
          ParamAngleY: -11,
          ParamBodyAngleX: 3.4,
        },
      }
      const fallbackReset = {
        generation: 1003,
        id: 7,
        inputRevision: 0,
        kind: 'reset' as const,
        state: fallbackState,
      }
      cpu.process(fallbackReset)
      gpu.process(fallbackReset)
      const fallbackRequest = {
        id: 8,
        kind: 'produce' as const,
        request: {buffer: new ArrayBuffer(engine.bytes), deltaTime: 0, generation: 1003, time: 0},
      }
      const fallbackExpected = cpu.process(fallbackRequest)
      const fallbackActual = gpu.process({
        ...fallbackRequest,
        request: {...fallbackRequest.request, buffer: new ArrayBuffer(engine.bytes)},
      })
      const fallbackExpectedFrame = readFrame(fallbackExpected)
      const fallbackActualFrame = readFrame(fallbackActual)
      const fallbackBatch = gpu.geometry!.take()
      if (fallbackBatch === undefined) {
        throw new Error('Missing fallback geometry')
      }
      const length = fallbackActualFrame.computed.vertices.length
      structuredClone(fallbackActualFrame.computed.vertices, {
        transfer: [fallbackActualFrame.computed.vertices.buffer],
      })
      const recovered = new Float32Array(length)
      gpu.geometry!.finish(fallbackBatch.id, recovered, new Uint32Array(), true)
      expect(new Uint32Array(recovered.buffer), 'lost device storage recovery').toEqual(
        new Uint32Array(fallbackExpectedFrame.computed.vertices.buffer),
      )
      expect(stats.frames).toBeGreaterThan(0)
      expect(stats.vertices).toBeGreaterThan(1000)
      console.warn(JSON.stringify({cases: scenarios.length, ...stats}))
    } finally {
      kernel.free()
      cpu.destroy()
      gpu.destroy()
    }
  },
  120000,
)
