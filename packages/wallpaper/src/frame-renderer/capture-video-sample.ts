const SAMPLE_LENGTH = 32
interface CaptureVideoSampleOptions {
  readonly video: HTMLVideoElement
  readonly canvas?: HTMLCanvasElement
}

export interface VideoSample {
  readonly time: number
  readonly width: number
  readonly height: number
  readonly pixels: Uint8ClampedArray
}

/** Copies a decoded frame into a small, aspect-preserving color sample. */
export const captureVideoSample = (options: CaptureVideoSampleOptions): VideoSample => {
  const {video} = options
  const canvas = options.canvas ?? document.createElement('canvas')
  const scale = SAMPLE_LENGTH / Math.max(video.videoWidth, video.videoHeight, 1)
  canvas.width = Math.max(1, Math.round(video.videoWidth * scale))
  canvas.height = Math.max(1, Math.round(video.videoHeight * scale))
  const context = canvas.getContext('2d', {willReadFrequently: true})
  if (context === null) {
    throw new Error('Video background canvas is unavailable.')
  }
  context.drawImage(video, 0, 0, canvas.width, canvas.height)
  return {
    height: canvas.height,
    pixels: context.getImageData(0, 0, canvas.width, canvas.height).data,
    time: video.currentTime,
    width: canvas.width,
  }
}
