import {clearHtmlMediaElement} from 'src/utils/clear-html-media-element'
import {waitForEvent} from 'src/utils/wait-for-event'
import {replaceBlobObjectUrl} from 'src/features/blob-object-url'
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

/** Samples a separate muted decoder and releases it on completion, failure, or cancellation. */
export const sampleVideo = async (blob: Blob, signal: AbortSignal): Promise<VideoSample[]> => {
  const video = document.createElement('video')
  const url = replaceBlobObjectUrl(null, () => blob)
  video.muted = true
  video.playsInline = true
  video.preload = 'auto'
  const waiting = {
    failure: {event: 'error', reason: () => new Error('Video background decoding failed.')},
    signal,
    target: video,
    timeout: DECODE_TIMEOUT,
  }
  try {
    await waitForEvent({
      ...waiting,
      event: 'loadeddata',
      start: () => {
        video.src = url
        video.load()
      },
    })
    const samples = [captureSample(video)]
    for (const time of sampleTimes(video.duration).slice(1)) {
      signal.throwIfAborted()
      if (Math.abs(time - video.currentTime) > SEEK_EPSILON) {
        // One decoder must finish each seek before starting the next.
        // eslint-disable-next-line no-await-in-loop
        await waitForEvent({
          ...waiting,
          event: 'seeked',
          start: () => {
            video.currentTime = time
          },
        })
        samples.push(captureSample(video))
      }
    }
    return samples
  } finally {
    clearHtmlMediaElement(video)
    replaceBlobObjectUrl(url, () => null)
  }
}
