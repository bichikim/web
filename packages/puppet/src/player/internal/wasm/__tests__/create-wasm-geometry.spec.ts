import {expect, test, vi} from 'vitest'
import {createWasmGeometry} from '../create-wasm-geometry'

const createCache = () => {
  const memory = new WebAssembly.Memory({initial: 1})
  const stored = new Float32Array(memory.buffer, 8, 8)
  stored.set([1, 2, 3, 4, 5, 6, 7, 8])
  const invoke = vi.fn((operation: string, ..._args: number[]) => {
    switch (operation) {
      case 'worker_cache_geometry':
        return 1
      case 'worker_geometry_input':
        return stored.byteOffset
      case 'worker_geometry_length':
        return stored.length
      default:
        throw new Error(operation)
    }
  })
  const geometry = createWasmGeometry({destroyed: () => false, handle: 1, invoke, memory})
  return {geometry, invoke, stored}
}

test('should write packed coordinates only to the named ranges', () => {
  const {geometry, invoke, stored} = createCache()
  geometry.cache(3, new Float32Array([9, -0, 10, 11]), new Uint32Array([6, 2, 0, 2]))
  expect(stored).toEqual(new Float32Array([10, 11, 3, 4, 5, 6, 9, -0]))
  expect(invoke).toHaveBeenLastCalledWith('worker_cache_geometry', 1, 3, 0)
})

test('should discard an invalid packet before writing coordinates', () => {
  const {geometry, invoke, stored} = createCache()
  expect(() =>
    geometry.cache(3, new Float32Array([9, 10, 11, 12]), new Uint32Array([0, 2, 7, 2])),
  ).toThrow('Invalid packed geometry range')
  expect(stored).toEqual(new Float32Array([1, 2, 3, 4, 5, 6, 7, 8]))
  expect(invoke).toHaveBeenLastCalledWith('worker_cache_geometry', 1, 3, 1)
})
