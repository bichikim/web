import {sampleTimes} from './timeline'

const SAMPLE_LENGTH = 32
const DECODE_TIMEOUT = 10_000
const SEEK_EPSILON = 0.001

export interface VideoSample {
  readonly time: number
  readonly width: number
  readonly height: number
  readonly pixels: Uint8ClampedArray
}

/** Copies a decoded frame into a small, aspect-preserving color sample. */
export const captureSample = (video: HTMLVideoElement): VideoSample => {
  const canvas = document.createElement('canvas')
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

const waitForMedia = (
  video: HTMLVideoElement,
  event: string,
  signal: AbortSignal,
  start: () => void,
): Promise<void> =>
  new Promise((resolve, reject) => {
    signal.throwIfAborted()
    const finish = (error?: unknown) => {
      clearTimeout(timeout)
      video.removeEventListener(event, ready)
      video.removeEventListener('error', fail)
      signal.removeEventListener('abort', abort)
      if (error === undefined) {
        resolve()
      } else {
        reject(error)
      }
    }
    const ready = () => finish()
    const fail = () => finish(new Error('Video background decoding failed.'))
    const abort = () => finish(signal.reason)
    const timeout = setTimeout(fail, DECODE_TIMEOUT)
    video.addEventListener(event, ready, {once: true})
    video.addEventListener('error', fail, {once: true})
    signal.addEventListener('abort', abort, {once: true})
    try {
      start()
    } catch (error) {
      finish(error)
    }
  })

/** Samples a separate muted decoder and releases it on completion, failure, or cancellation. */
export const sampleVideo = async (blob: Blob, signal: AbortSignal): Promise<VideoSample[]> => {
  const video = document.createElement('video')
  const url = URL.createObjectURL(blob)
  video.muted = true
  video.playsInline = true
  video.preload = 'auto'
  try {
    await waitForMedia(video, 'loadeddata', signal, () => {
      video.src = url
      video.load()
    })
    const samples = [captureSample(video)]
    for (const time of sampleTimes(video.duration).slice(1)) {
      signal.throwIfAborted()
      if (Math.abs(time - video.currentTime) > SEEK_EPSILON) {
        // One decoder must finish each seek before starting the next.
        // eslint-disable-next-line no-await-in-loop
        await waitForMedia(video, 'seeked', signal, () => {
          video.currentTime = time
        })
        samples.push(captureSample(video))
      }
    }
    return samples
  } finally {
    video.pause()
    video.removeAttribute('src')
    video.load()
    URL.revokeObjectURL(url)
  }
}
