import {expect, test} from 'vitest'
import runtimeUrl from '../../src/player/internal/wasm/runtime.wasm?url'
import {createWasmWorker} from '../../src/player/internal/wasm/create-worker'
import type {WasmGeometry} from '../../src/player/internal/wasm/create-wasm-geometry'
import {createBufferEngine} from '../../src/player/buffering/create-buffer-engine'
import {preparePuppetDocument} from '../../src/player/prepare-puppet-document'
import {getPartRenderFrame} from '../../src/player/internal/render-plan'
import {packDisplay} from '../../src/player/rendering/wgpu/display'
import {getGeometryCacheRanges} from '../../src/player/rendering/wgpu/create-geometry-service'
import initialize, {
  CanvasRenderer,
  GeometryFinisher,
} from '../../src/player/rendering/wgpu/wasm/runtime'

const cacheGeometry = (
  geometry: WasmGeometry,
  batch: {readonly id: number; readonly commands: Uint32Array},
  source: Float32Array,
  cache: Float32Array | undefined,
) => {
  if (cache === undefined) {
    throw new Error('Missing geometry cache')
  }
  const ranges = cache.length === source.length ? undefined : getGeometryCacheRanges(batch.commands)
  geometry.cache(batch.id, cache, ranges)
}
const model = import.meta.env.VITE_PUPPET_MODEL
const adapter = await navigator.gpu?.requestAdapter()
const gpuTest = test.skipIf(adapter === null || adapter === undefined || model === undefined)
gpuTest(
  'should preserve actual-model geometry and owned GPU frames on a shared rendering device',
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
    cpu.process({audio: new Map(), document, id: 1, kind: 'initialize'})
    gpu.process({audio: new Map(), deferGeometry: true, document, id: 1, kind: 'initialize'})
    await initialize()
    const renderer = await CanvasRenderer.create(
      new OffscreenCanvas(4, 4),
      4,
      4,
      JSON.stringify({
        parts: document.parts.map((part) => ({
          id: part.id,
          indices: part.mesh.indices,
          texture: 0,
          uvs: part.mesh.uvs,
          vertices: part.mesh.vertices,
        })),
        plans: getPartRenderFrame(document).plans,
        viewport: document.viewport,
      }),
      1,
    )
    const image = await createImageBitmap(
      new ImageData(new Uint8ClampedArray([255, 255, 255, 255]), 1, 1),
    )
    renderer.texture(image)
    image.close()
    await renderer.enable_geometry()
    const layout = gpu.geometry!.layout()
    const finisher = new GeometryFinisher(layout)
    const index = new Map(document.parts.map((part, i) => [part.id, i]))
    const engine = createBufferEngine(document)
    const initial = engine.step(0, new ArrayBuffer(engine.bytes)).state
    const cases = [
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
    let maximumPacket = 0
    try {
      for (const [caseIndex, scenario] of cases.entries()) {
        const state = {
          ...initial,
          parameterValues: {...initial.parameterValues, ...scenario.values},
        }
        const generation = caseIndex + 1
        cpu.process({generation, id: 2, inputRevision: 0, kind: 'reset', state})
        gpu.process({generation, id: 2, inputRevision: 0, kind: 'reset', state})
        const request = {
          id: 3,
          kind: 'produce' as const,
          request: {buffer: new ArrayBuffer(engine.bytes), deltaTime: 0, generation, time: 0},
        }
        const expected = cpu.process(request)
        const actual = gpu.process({
          ...request,
          request: {...request.request, buffer: new ArrayBuffer(engine.bytes)},
        })
        if (
          expected.kind !== 'produced' ||
          expected.frame.kind !== 'frame' ||
          actual.kind !== 'produced' ||
          actual.frame.kind !== 'frame'
        ) {
          throw new Error('Missing numerical frame')
        }
        const batch = gpu.geometry!.take()
        if (batch === undefined) {
          throw new Error('Missing deferred frame')
        }
        maximumPacket = Math.max(maximumPacket, batch.plan.byteLength)
        // eslint-disable-next-line no-await-in-loop -- Each completion updates this model's numerical cache.
        const cache = await renderer.prepare_geometry(
          caseIndex + 1,
          actual.frame.computed.vertices,
          batch.commands,
          batch.values,
          batch.plan,
          finisher,
          () => false,
        )
        cacheGeometry(gpu.geometry!, batch, actual.frame.computed.vertices, cache)
        const vertices = renderer.draw_geometry(
          caseIndex + 1,
          packDisplay(actual.frame.computed.frame, index),
        )
        const expectedWords = new Uint32Array(expected.frame.computed.vertices.buffer)
        expect(
          new Uint32Array(vertices.buffer).findIndex((word, i) => word !== expectedWords[i]),
          scenario.name,
        ).toBe(-1)
        // A normal redraw may write the shared position buffer between predictions.
        renderer.draw(vertices, packDisplay(actual.frame.computed.frame, index))
        renderer.release_geometry(caseIndex + 1)
      }
      const snapshots = []
      let preparation:
        | {
            readonly vertices: Float32Array
            readonly commands: Uint32Array
            readonly values: Float32Array
            readonly plan: Float64Array
          }
        | undefined
      for (const [i, value] of [-23, 19, 7].entries()) {
        const state = {
          ...initial,
          parameterValues: {
            ...initial.parameterValues,
            ParamAngleX: value,
            ParamAngleY: value * 0.3,
            ParamBodyAngleX: value * 0.2,
          },
        }
        const generation = 1000 + i
        cpu.process({generation, id: 4, inputRevision: 0, kind: 'reset', state})
        gpu.process({generation, id: 4, inputRevision: 0, kind: 'reset', state})
        const request = {
          id: 5,
          kind: 'produce' as const,
          request: {buffer: new ArrayBuffer(engine.bytes), deltaTime: 0, generation, time: 0},
        }
        const expected = cpu.process(request)
        const actual = gpu.process({
          ...request,
          request: {...request.request, buffer: new ArrayBuffer(engine.bytes)},
        })
        if (
          expected.kind !== 'produced' ||
          expected.frame.kind !== 'frame' ||
          actual.kind !== 'produced' ||
          actual.frame.kind !== 'frame'
        ) {
          throw new Error('Missing pipeline frame')
        }
        const batch = gpu.geometry!.take()
        if (batch === undefined) {
          throw new Error('Missing pipeline geometry')
        }
        preparation = {...batch, vertices: actual.frame.computed.vertices}
        // eslint-disable-next-line no-await-in-loop -- Retain three GPU outputs before drawing an earlier snapshot.
        const cache = await renderer.prepare_geometry(
          1000 + i,
          actual.frame.computed.vertices,
          batch.commands,
          batch.values,
          batch.plan,
          finisher,
          () => false,
        )
        cacheGeometry(gpu.geometry!, batch, actual.frame.computed.vertices, cache)
        snapshots.push({
          display: packDisplay(actual.frame.computed.frame, index),
          expected: expected.frame,
          id: 1000 + i,
        })
      }
      for (const i of [2, 0, 1]) {
        const item = snapshots[i]!
        const vertices = renderer.draw_geometry(item.id, item.display)
        const expectedWords = new Uint32Array(item.expected.computed.vertices.buffer)
        expect(
          new Uint32Array(vertices.buffer).findIndex(
            (word, index) => word !== expectedWords[index],
          ),
          `resident ${i}`,
        ).toBe(-1)
        renderer.release_geometry(item.id)
      }
      if (preparation === undefined) {
        throw new Error('Missing capacity fixture')
      }
      const retain = (id: number) =>
        renderer.prepare_geometry(
          id,
          preparation.vertices,
          preparation.commands,
          preparation.values,
          preparation.plan,
          finisher,
          () => false,
        )
      for (let id = 2000; id < 2016; id += 1) {
        // eslint-disable-next-line no-await-in-loop -- Exercise the native ownership limit without releasing frames.
        await retain(id)
      }
      await expect(retain(2016)).rejects.toThrow('Invalid resident geometry frame')
      renderer.release_geometry(2007)
      await retain(2016)
      for (let id = 2000; id <= 2016; id += 1) {
        renderer.release_geometry(id)
      }
      console.warn(
        JSON.stringify({
          cases: cases.length,
          layoutBytes: layout.byteLength,
          maximumPacket,
          sharedDevice: true,
        }),
      )
    } finally {
      finisher.free()
      renderer.free()
      cpu.destroy()
      gpu.destroy()
    }
  },
  120000,
)
