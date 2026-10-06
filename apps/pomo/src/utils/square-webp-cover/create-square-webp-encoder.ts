import {createSquareWebpCanvas} from './create-square-webp-canvas'
import type {SquareWebpCanvas} from './types'
export interface SquareWebpEncoderOptions {
  readonly source: CanvasImageSource
  readonly sourceSize: number
  readonly sourceX: number
  readonly sourceY: number
  readonly targetSize: number
  readonly contextOptions?: CanvasRenderingContext2DSettings
  readonly contextError: () => Error
  readonly encodingError: () => Error
}
/** Draws one square crop and encodes it at each requested WebP quality. */
export const createSquareWebpEncoder = (
  options: SquareWebpEncoderOptions,
  canvas: SquareWebpCanvas = createSquareWebpCanvas(),
) => {
  canvas.height = options.targetSize
  canvas.width = options.targetSize
  const context =
    options.contextOptions === undefined
      ? canvas.getContext('2d')
      : canvas.getContext('2d', options.contextOptions)
  if (context === null) {
    throw options.contextError()
  }
  context.drawImage(
    options.source,
    options.sourceX,
    options.sourceY,
    options.sourceSize,
    options.sourceSize,
    0,
    0,
    options.targetSize,
    options.targetSize,
  )
  return (quality: number): Promise<Blob> =>
    new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob === null) {
            reject(options.encodingError())
          } else {
            resolve(blob)
          }
        },
        'image/webp',
        quality,
      )
    })
}
