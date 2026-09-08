import {getLayerImageData, getLayerMaskImageData, type Layer, type PixelData} from 'ag-psd'
const CHANNELS = 4
const ALPHA_CHANNEL = 3
const MAXIMUM_ALPHA = 255
const maskAlpha = (pixels: PixelData, x: number, y: number, fallback: number) =>
  x >= 0 && y >= 0 && x < pixels.width && y < pixels.height
    ? pixels.data[(y * pixels.width + x) * CHANNELS]!
    : fallback
export const readPsdPixels = (layer: Layer, masks: ReadonlyArray<Layer>) => {
  const source = layer.imageData ?? getLayerImageData(layer)
  if (source === undefined) {
    return undefined
  }
  const data = new Uint8ClampedArray(source.data)
  for (const owner of masks) {
    const {mask} = owner
    const pixels =
      mask === undefined || mask.disabled
        ? undefined
        : (mask.imageData ?? getLayerMaskImageData(owner))
    if (pixels !== undefined && mask !== undefined) {
      const left = (mask.left ?? 0) + (mask.positionRelativeToLayer ? (owner.left ?? 0) : 0)
      const top = (mask.top ?? 0) + (mask.positionRelativeToLayer ? (owner.top ?? 0) : 0)
      for (let y = 0; y < source.height; y += 1) {
        for (let x = 0; x < source.width; x += 1) {
          const mx = x + (layer.left ?? 0) - left
          const my = y + (layer.top ?? 0) - top
          const alpha = maskAlpha(pixels, mx, my, mask.defaultColor ?? MAXIMUM_ALPHA)
          const index = (y * source.width + x) * CHANNELS + ALPHA_CHANNEL
          data[index] = Math.round((data[index]! * alpha) / MAXIMUM_ALPHA)
        }
      }
    }
  }
  return {data, height: source.height, width: source.width}
}
