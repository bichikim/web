import type {PixelData} from 'ag-psd'

/** Encodes layer pixels in a window or Worker without touching the editor canvas. */
export const encodePsdTexture = async (pixels: PixelData): Promise<string> => {
  const canvas =
    typeof OffscreenCanvas === 'undefined'
      ? document.createElement('canvas')
      : new OffscreenCanvas(pixels.width, pixels.height)
  canvas.width = pixels.width
  canvas.height = pixels.height
  const drawing = canvas.getContext('2d')
  if (drawing === null || !('putImageData' in drawing)) {
    throw new Error('Canvas unavailable')
  }
  const image = drawing.createImageData(pixels.width, pixels.height)
  image.data.set(pixels.data)
  drawing.putImageData(image, 0, 0)
  if (!('convertToBlob' in canvas)) {
    return canvas.toDataURL('image/png')
  }
  const blob = await canvas.convertToBlob({type: 'image/png'})
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(reader.error)
    reader.onload = () =>
      typeof reader.result === 'string'
        ? resolve(reader.result)
        : reject(new Error('PNG encoding failed'))
    reader.readAsDataURL(blob)
  })
}
