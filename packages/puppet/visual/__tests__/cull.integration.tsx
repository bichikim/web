import {expect, test} from 'vitest'
import floatWords from '../../native/renderer/src/geometry/float.wgsl?raw'
import integerWords from '../../native/renderer/src/geometry/words.wgsl?raw'
import cull from '../../native/renderer/src/renderer/cull.wgsl?raw'
import winding from '../../native/renderer/src/renderer/winding.wgsl?raw'

declare const GPUBufferUsage: Readonly<
  Record<'COPY_DST' | 'COPY_SRC' | 'MAP_READ' | 'STORAGE', number>
>
declare const GPUMapMode: {readonly READ: number}

const adapter = await navigator.gpu?.requestAdapter()

test.skipIf(adapter === null || adapter === undefined)(
  'should preserve CPU winding decisions for small and nearly collinear triangles',
  async () => {
    const device = await adapter!.requestDevice()
    try {
      const tiny = [0, 0, 1e-24, 1e-24, 1e-24, 0]
      const cases = [
        {flip: true, part: 0, rest: 1, vertices: tiny},
        {flip: false, part: 0, rest: -1, vertices: tiny},
        {flip: false, part: 1, rest: 1, vertices: tiny},
        {flip: true, part: 0, rest: 1, vertices: [0, 0, 1 + 2 ** -23, 1, 1, 1 - 2 ** -23]},
        {flip: false, part: 0, rest: 1, vertices: [0, 0, 1, 1, 2, 2]},
        {flip: true, part: 0, rest: 1, vertices: [0, 0, 2 ** -149, 2 ** -149, 2 ** -149, 0]},
      ]
      const inputs = [
        new Float32Array(cases.flatMap(({vertices}) => vertices)),
        new Uint32Array(
          cases.flatMap(({part, rest}, index) => [
            index * 3,
            index * 3 + 1,
            index * 3 + 2,
            rest,
            part,
          ]),
        ),
        new Uint32Array([1, 0]),
      ].map((data) => {
        const buffer = device.createBuffer({
          size: data.byteLength,
          // eslint-disable-next-line no-bitwise -- WebGPU buffer usages are flags.
          usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        })
        device.queue.writeBuffer(buffer, 0, data)
        return buffer
      })
      const expected = cases.flatMap(({flip}, index) => {
        const first = index * 3
        return flip ? [first, first, first] : [first, first + 1, first + 2]
      })
      const size = expected.length * Uint32Array.BYTES_PER_ELEMENT
      const output = device.createBuffer({
        size,
        // eslint-disable-next-line no-bitwise -- WebGPU buffer usages are flags.
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
      })
      const readback = device.createBuffer({
        size,
        // eslint-disable-next-line no-bitwise -- WebGPU buffer usages are flags.
        usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
      })
      const shader = device.createShaderModule({
        code: [integerWords, floatWords, winding, cull].join('\n'),
      })
      const pipeline = await device.createComputePipelineAsync({
        compute: {entryPoint: 'main', module: shader},
        layout: 'auto',
      })
      const group = device.createBindGroup({
        entries: [...inputs, output].map((buffer, binding) => ({binding, resource: {buffer}})),
        layout: pipeline.getBindGroupLayout(0),
      })
      const encoder = device.createCommandEncoder()
      const pass = encoder.beginComputePass()
      pass.setPipeline(pipeline)
      pass.setBindGroup(0, group)
      pass.dispatchWorkgroups(1)
      pass.end()
      encoder.copyBufferToBuffer(output, 0, readback, 0, size)
      device.queue.submit([encoder.finish()])
      await readback.mapAsync(GPUMapMode.READ)
      expect(Array.from(new Uint32Array(readback.getMappedRange()))).toEqual(expected)
    } finally {
      device.destroy()
    }
  },
)
