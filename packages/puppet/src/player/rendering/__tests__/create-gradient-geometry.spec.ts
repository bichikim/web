import {BatchGeometry} from 'pixi.js'
import {describe, expect, test} from 'vitest'
import {createGradientGeometry} from '../create-gradient-geometry'

const createSource = () => {
  const source = new BatchGeometry()
  source.buffers[0]!.data = new Float32Array([0, 0, 0, 0, 0, 0, 2, 0, 1, 0, 0, 0, 0, 2, 0, 1, 0, 0])
  source.indexBuffer!.data = new Uint32Array([0, 1, 2])
  return source
}

describe('createGradientGeometry', () => {
  test('should remap provoking indices when vertex counts grow and retain capacity when they shrink', () => {
    const source = createSource()
    const initial = source.buffers[0]!.data
    const target = createGradientGeometry(source)
    target.update()
    const index = target.geometry.indexBuffer
    const revision = index._updateID
    const larger = new Float32Array(24)
    larger.set(initial)
    source.buffers[0]!.data = larger
    target.update()
    expect(index.data).toEqual(Uint32Array.of(0, 1, 4))
    expect(index._updateID).toBeGreaterThan(revision)
    const capacity = target.geometry.getBuffer('aPosition').data
    source.buffers[0]!.data = initial
    target.update()
    expect(index.data).toEqual(Uint32Array.of(0, 1, 3))
    expect(target.geometry.getBuffer('aPosition').data).toBe(capacity)
    target.destroy()
    source.destroy(true)
  })
  test('should reuse buffers until their source changes and recompute after in-place edits', () => {
    const source = createSource()
    const target = createGradientGeometry(source)
    target.update()
    const buffer = target.geometry.getBuffer('aPosition')
    const data = buffer.data
    const revision = buffer._updateID
    const topologyRevision = target.geometry.indexBuffer._updateID
    const topology = target.geometry.indexBuffer.data.slice()
    target.update()
    expect(buffer._updateID).toBe(revision)
    expect(buffer.data).toBe(data)
    expect(target.geometry.indexBuffer._updateID).toBe(topologyRevision)
    expect(target.geometry.indexBuffer.data).toEqual(topology)
    source.buffers[0]!.data[6] = 4
    source.buffers[0]!.update()
    target.update()
    expect(buffer.data).toBe(data)
    expect(target.geometry.indexBuffer._updateID).toBe(topologyRevision)
    expect(target.geometry.indexBuffer.data).toEqual(topology)
    expect(target.geometry.getBuffer('aUvGradient').data.slice(12, 16)).toEqual(
      Float32Array.of(0.25, 0, 0, 0.5),
    )
    target.destroy()
    source.destroy(true)
  })

  test('should size active output from used indices and release its owned resources once', () => {
    const source = createSource()
    source.indexBuffer!.setDataWithSize(new Uint32Array([0, 1, 2, 2, 1, 0]), 3, false)
    const target = createGradientGeometry(source)
    target.update()
    const buffer = target.geometry.getBuffer('aPosition')
    const indices = target.geometry.indexBuffer!
    const gradients = target.geometry.getBuffer('aUvGradient')
    expect(buffer.data.length).toBe(24)
    expect(indices.data).toEqual(Uint32Array.of(0, 1, 3))
    target.destroy()
    target.destroy()
    expect(buffer.destroyed).toBe(true)
    expect(gradients.destroyed).toBe(true)
    expect(indices.destroyed).toBe(true)
    expect(source.buffers[0]!.destroyed).toBe(false)
    source.destroy(true)
  })

  test('should upload only provoking gradients and retain them across empty and resized draws', () => {
    const source = createSource()
    const target = createGradientGeometry(source)
    target.update()
    const gradients = target.geometry.getBuffer('aUvGradient')
    expect(gradients._updateOffset).toBe(3 * 4 * Float32Array.BYTES_PER_ELEMENT)
    expect(gradients._updateSize).toBe(4 * Float32Array.BYTES_PER_ELEMENT)
    source.indexBuffer!.setDataWithSize(new Uint32Array([0, 1, 2]), 0, false)
    target.update()
    source.indexBuffer!.setDataWithSize(new Uint32Array([2, 1, 0]), 3, false)
    target.update()
    expect(gradients.data.slice(12, 16)).toEqual(Float32Array.of(0.5, -0, -0, 0.5))
    expect(gradients._updateOffset).toBe(48)
    expect(gradients._updateSize).toBe(16)
    target.destroy()
    source.destroy(true)
  })

  test('should preserve offsets beyond Uint16 range and rebuild after in-place topology and UV edits', () => {
    const source = createSource()
    const data = new Float32Array(12003 * 6)
    data.set(source.buffers[0]!.data, 12000 * 6)
    source.buffers[0]!.data = data
    source.indexBuffer!.data = Uint16Array.of(12000, 12001, 12002)
    const target = createGradientGeometry(source, 'first')
    target.update()
    const gradients = target.geometry.getBuffer('aUvGradient')
    const offset = 12003 * 4
    expect(gradients.data.slice(offset, offset + 4)).toEqual(Float32Array.of(0.5, 0, 0, 0.5))
    source.indexBuffer!.data.set([12002, 12001, 12000])
    source.indexBuffer!.update()
    data[12001 * 6 + 2] = 0.5
    source.buffers[0]!.update()
    target.update()
    expect(gradients.data.slice(offset, offset + 4)).toEqual(Float32Array.of(0.25, -0, -0, 0.5))
    expect(target.geometry.getBuffer('aPosition').data.slice(12003 * 6, 12003 * 6 + 4)).toEqual(
      Float32Array.of(0, 2, 0, 1),
    )
    target.destroy()
    source.destroy(true)
  })
})
