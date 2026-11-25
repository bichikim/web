import type {MeshSimple} from 'pixi.js'
import {meshPoint} from '../internal/mesh-point'
import type {RuntimeLayer, RuntimePart, RuntimePartMask} from './types'

interface CreatePartPickerOptions {
  /** Canvas whose document owns the temporary one-pixel sampling surface. */
  readonly canvas: HTMLCanvasElement
  /** Currently rendered parts; resources remain owned by the renderer. */
  readonly parts: ReadonlyMap<string, RuntimePart>
  /** Scene layers whose clipping and opacity also apply to parts. */
  readonly layers: ReadonlyMap<string, RuntimeLayer>
  /** Current back-to-front part identities. */
  readonly order: () => readonly string[]
}
interface Point {
  readonly x: number
  readonly y: number
}
const ALPHA_CHANNEL_MAX = 255
const OPACITY_INDEX = 18
const ALPHA_THRESHOLD = 0.05

/** Picks painted texels, respecting deformed/culling geometry, opacity and nested masks. */
export const createPartPicker = (options: CreatePartPickerOptions) => {
  let sample: CanvasRenderingContext2D | null = null
  const texel = (mesh: MeshSimple, point: Point): number => {
    const hit = meshPoint({indices: mesh.geometry.indices, point, vertices: mesh.vertices})
    const image = mesh.texture.source.resource
    if (hit === undefined || !(image instanceof HTMLImageElement)) {
      return 0
    }
    if (sample === null) {
      const canvas = options.canvas.ownerDocument.createElement('canvas')
      canvas.width = 1
      canvas.height = 1
      sample = canvas.getContext('2d', {willReadFrequently: true})
    }
    if (sample === null) {
      throw new Error('Cannot sample character texture')
    }
    const {uvs} = mesh.geometry
    const textureX = hit.indices.reduce(
      (sum, index, axis) => sum + uvs[index * 2]! * hit.weights[axis]!,
      0,
    )
    const textureY = hit.indices.reduce(
      (sum, index, axis) => sum + uvs[index * 2 + 1]! * hit.weights[axis]!,
      0,
    )
    const x = Math.max(
      0,
      Math.min(image.naturalWidth - 1, Math.floor(textureX * image.naturalWidth)),
    )
    const y = Math.max(
      0,
      Math.min(image.naturalHeight - 1, Math.floor(textureY * image.naturalHeight)),
    )
    sample.clearRect(0, 0, 1, 1)
    sample.drawImage(image, x, y, 1, 1, 0, 0, 1, 1)
    return sample.getImageData(0, 0, 1, 1).data[3]! / ALPHA_CHANNEL_MAX
  }
  const maskAlpha = (mask: RuntimePartMask | undefined, point: Point): number => {
    if (mask === undefined) {
      return 1
    }
    const alpha = mask.meshes.reduce((coverage, source) => {
      const value = texel(source.mesh, point) * maskAlpha(source.mask, point)
      return coverage + value * (1 - coverage)
    }, 0)
    return mask.filter.inverse ? 1 - alpha : alpha
  }
  return (point: Point): string | undefined =>
    options
      .order()
      .toReversed()
      .find((id) => {
        const part = options.parts.get(id)
        if (
          part === undefined ||
          !part.mesh.visible ||
          !part.mesh.renderable ||
          part.mesh.getGlobalAlpha() <= ALPHA_THRESHOLD
        ) {
          return false
        }
        const layers = [...options.layers.values()].filter((layer) =>
          layer.memberPartIds.includes(id),
        )
        return (
          texel(part.mesh, point) *
            part.mesh.getGlobalAlpha() *
            maskAlpha(part.mask, point) *
            layers.reduce(
              (alpha, layer) =>
                alpha *
                (layer.colorFilter?.matrix[OPACITY_INDEX] ?? 1) *
                maskAlpha(layer.mask, point),
              1,
            ) >
          ALPHA_THRESHOLD
        )
      })
}
