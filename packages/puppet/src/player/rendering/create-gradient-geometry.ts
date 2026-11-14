/* eslint-disable no-magic-numbers -- Attribute offsets describe the packed GPU vertex format. */
import {BufferUsage, Geometry, Buffer as GpuBuffer} from 'pixi.js'
import {
  BATCH_VERTEX_WORDS,
  GRADIENT_VERTEX_WORDS,
  packGradientVertices,
  type ProvokingVertex,
} from './pack-gradient-vertices'

export interface GradientGeometry {
  readonly geometry: Geometry
  update(): void
  destroy(): void
}

/** Owns expanded GPU geometry; borrows the default batcher's packed input buffers. */
export const createGradientGeometry = (
  source: Geometry,
  provoking: ProvokingVertex = 'last',
): GradientGeometry => {
  const vertices = new GpuBuffer({
    data: new Float32Array(),
    shrinkToFit: false,
    // eslint-disable-next-line no-bitwise -- GPU buffer usages are flags.
    usage: BufferUsage.VERTEX | BufferUsage.COPY_DST,
  })
  const gradients = new GpuBuffer({
    data: new Float32Array(),
    shrinkToFit: false,
    // eslint-disable-next-line no-bitwise -- GPU buffer usages are flags.
    usage: BufferUsage.VERTEX | BufferUsage.COPY_DST,
  })
  const indices = new GpuBuffer({
    data: new Uint32Array(),
    shrinkToFit: false,
    // eslint-disable-next-line no-bitwise -- GPU buffer usages are flags.
    usage: BufferUsage.INDEX | BufferUsage.COPY_DST,
  })
  const stride = BATCH_VERTEX_WORDS * Float32Array.BYTES_PER_ELEMENT
  const geometry = new Geometry({
    attributes: {
      aColor: {buffer: vertices, format: 'unorm8x4', offset: 16, stride},
      aPosition: {buffer: vertices, format: 'float32x2', offset: 0, stride},
      aTextureIdAndRound: {buffer: vertices, format: 'uint16x2', offset: 20, stride},
      aUV: {buffer: vertices, format: 'float32x2', offset: 8, stride},
      aUvGradient: {
        buffer: gradients,
        format: 'float32x4',
        stride: GRADIENT_VERTEX_WORDS * Float32Array.BYTES_PER_ELEMENT,
      },
    },
    indexBuffer: indices,
  })
  let vertexRevision = -1
  let indexRevision = -1
  let destroyed = false
  let previousCount = -1
  let offsets = new Uint32Array()
  return {
    destroy() {
      if (!destroyed) {
        destroyed = true
        geometry.destroy(true)
        offsets = new Uint32Array()
      }
    },
    geometry,
    update() {
      const input = source.getBuffer('aPosition')
      const index = source.indexBuffer
      if (input._updateID === vertexRevision && index?._updateID === indexRevision) {
        return
      }
      if (
        !(input.data instanceof Float32Array) ||
        index === undefined ||
        !(index.data instanceof Uint16Array || index.data instanceof Uint32Array)
      ) {
        throw new Error('UV gradients require default indexed batch geometry')
      }
      const count = (index._updateSize ?? index.data.byteLength) / index.data.BYTES_PER_ELEMENT
      const used = (input._updateSize ?? input.data.byteLength) / input.data.BYTES_PER_ELEMENT
      const vertexCount = used / BATCH_VERTEX_WORDS
      const triangles = Math.floor(count / 3)
      const expandedCount = vertexCount + triangles
      const capacity = expandedCount * BATCH_VERTEX_WORDS
      const gradientCount = expandedCount * GRADIENT_VERTEX_WORDS
      if (vertices.data.length < capacity) {
        vertices.data = new Float32Array(capacity)
      }
      if (gradients.data.length < gradientCount) {
        gradients.data = new Float32Array(gradientCount)
      }
      if (indices.data.length < count) {
        indices.data = new Uint32Array(count)
      }
      const topologyChanged = indexRevision !== index._updateID || previousCount !== vertexCount
      if (topologyChanged) {
        const indexData = index.data
        // Reuse capacity when animated culling repeatedly changes the active topology.
        if (offsets.length < count) {
          offsets = new Uint32Array(count)
        }
        for (let position = 0; position < count; position += 1) {
          // Invalid indices stay out of range instead of wrapping their packed offset.
          offsets[position] = Math.min(indexData[position]! * BATCH_VERTEX_WORDS, used)
        }
      }
      packGradientVertices({
        gradients: gradients.data as Float32Array,
        indices: index.data.subarray(0, count),
        provoking,
        source: input.data.subarray(0, used),
        target: vertices.data as Float32Array,
        targetIndices: topologyChanged ? (indices.data as Uint32Array) : undefined,
        vertexOffsets: offsets,
      })
      vertices.update(capacity * Float32Array.BYTES_PER_ELEMENT)
      if (triangles > 0) {
        // Only each triangle's added provoking vertex supplies the flat gradient.
        const gradientBytes = GRADIENT_VERTEX_WORDS * Float32Array.BYTES_PER_ELEMENT
        gradients.update(triangles * gradientBytes, vertexCount * gradientBytes)
      }
      if (topologyChanged) {
        indices.update(count * Uint32Array.BYTES_PER_ELEMENT)
      }
      previousCount = vertexCount
      vertexRevision = input._updateID
      indexRevision = index._updateID
    },
  }
}
