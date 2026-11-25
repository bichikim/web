import type {PuppetDocument} from '../../document'
import type {PartMaskRenderPlan, PartRenderFrame} from '../../internal/render-plan'
import {meshPoint} from '../../internal/mesh-point'
import {cullFlippedTriangles} from '../cull-flipped-triangles'
interface PickerOptions {
  readonly canvas: HTMLCanvasElement
  readonly document: () => PuppetDocument
  readonly frame: () => PartRenderFrame | undefined
  readonly vertices: (id: string) => Float32Array | undefined
  readonly images: ReadonlyMap<string, HTMLImageElement>
}
/** Uses displayed geometry and source alpha for the same opaque-part selection contract. */
export const createWgpuPicker = (options: PickerOptions) => {
  const minimumAlpha = 0.05
  const maximumAlpha = 255
  let context: CanvasRenderingContext2D | null = null
  return (point: {readonly x: number; readonly y: number}): string | undefined => {
    const document = options.document()
    const frame = options.frame()
    if (frame === undefined) {
      return undefined
    }
    const parts = new Map(document.parts.map((part) => [part.id, part]))
    const plans = new Map(frame.plans.map((plan) => [plan.partId, plan]))
    const texel = (id: string, purpose: 'part' | 'mask' = 'part'): number => {
      const part = parts.get(id)
      const plan = plans.get(id)
      const vertices = options.vertices(id)
      if (part === undefined || plan === undefined || vertices === undefined) {
        return 0
      }
      const indices =
        purpose === 'part' && plan.properties.culling
          ? cullFlippedTriangles(part.mesh.indices, part.mesh.vertices, vertices)
          : part.mesh.indices
      const hit = meshPoint({indices, point, vertices})
      const image = options.images.get(part.texture.src)
      if (hit === undefined || image === undefined) {
        return 0
      }
      if (context === null) {
        const canvas = options.canvas.ownerDocument.createElement('canvas')
        canvas.width = 1
        canvas.height = 1
        context = canvas.getContext('2d', {willReadFrequently: true})
      }
      if (context === null) {
        throw new Error('Cannot sample GPU character texture')
      }
      const coordinate = (axis: number) =>
        hit.indices.reduce(
          (sum, index, corner) => sum + part.mesh.uvs[index * 2 + axis]! * hit.weights[corner]!,
          0,
        )
      const x = Math.max(
        0,
        Math.min(image.naturalWidth - 1, Math.floor(coordinate(0) * image.naturalWidth)),
      )
      const y = Math.max(
        0,
        Math.min(image.naturalHeight - 1, Math.floor(coordinate(1) * image.naturalHeight)),
      )
      context.clearRect(0, 0, 1, 1)
      context.drawImage(image, x, y, 1, 1, 0, 0, 1, 1)
      return context.getImageData(0, 0, 1, 1).data[3]! / maximumAlpha
    }
    const mask = (value: PartMaskRenderPlan | undefined, inverted = false): number => {
      if (value === undefined) {
        return 1
      }
      const alpha = value.sources.reduce((sum, source) => {
        const coverage = texel(source.partId, 'mask') * mask(source.mask, source.invertedMask)
        return sum + coverage * (1 - sum)
      }, 0)
      return inverted ? 1 - alpha : alpha
    }
    return frame.plans
      .toReversed()
      .find(
        (plan) =>
          plan.visible &&
          plan.render &&
          plan.properties.opacity > minimumAlpha &&
          texel(plan.partId) *
            plan.properties.opacity *
            mask(plan.mask, plan.properties.invertedMask) >
            minimumAlpha,
      )?.partId
  }
}
