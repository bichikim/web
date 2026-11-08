import {initializeCanvas} from 'ag-psd'

/** Configures raw RGBA layer/mask decoding without Canvas in a Node process. Composite rendering is unavailable. */
export const initializePsdPixels = (): void => {
  const RGBA_CHANNELS = 4
  initializeCanvas(
    () => {
      throw new Error('PSD composite rendering requires a canvas adapter')
    },
    (width, height) => ({
      colorSpace: 'srgb',
      data: new Uint8ClampedArray(width * height * RGBA_CHANNELS),
      height,
      width,
    }),
  )
}
