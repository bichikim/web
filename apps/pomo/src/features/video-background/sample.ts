import {subscribeEvent} from 'src/utils/subscribe-event'
import {videoSamplingRuntime} from './runtime'
import {sampleTimes} from './timeline'

const DECODE_TIMEOUT = 10_000
const SEEK_EPSILON = 0.001

interface MediaWaitOptions {
  readonly event: 'loadeddata' | 'seeked'
  readonly signal: AbortSignal
  readonly start: () => void
  readonly video: HTMLVideoElement
}

export {type VideoSample} from '@winter-love/wallpaper/frame-renderer/capture-video-sample'
import {
  captureVideoSample,
  type VideoSample,
} from '@winter-love/wallpaper/frame-renderer/capture-video-sample'

export const captureSample = (video: HTMLVideoElement): VideoSample =>
  captureVideoSample({canvas: videoSamplingRuntime.createCanvas(), video})

const waitForMedia = (options: MediaWaitOptions): Promise<void> =>
  new Promise((resolve, reject) => {
    const {event, signal, start, video} = options
    signal.throwIfAborted()
    let settled = false
    const finish = (complete: () => void) => {
      if (settled) {
        return
      }
      settled = true
      clearTimeout(timeout)
      releaseReady()
      releaseFailure()
      releaseAbort()
      complete()
    }
    const ready = () => finish(resolve)
    const fail = () => finish(() => reject(new Error('Video background decoding failed.')))
    const abort = () => finish(() => reject(signal.reason))
    const releaseReady = subscribeEvent(video, event, ready, {once: true})
    const releaseFailure = subscribeEvent(video, 'error', fail, {once: true})
    const releaseAbort = subscribeEvent(signal, 'abort', abort, {once: true})
    const timeout = setTimeout(fail, DECODE_TIMEOUT)
    try {
      start()
    } catch (error: unknown) {
      finish(() => reject(error))
    }
  })

/** Samples a separate muted decoder and releases it on completion, failure, or cancellation. */
export const sampleVideo = async (blob: Blob, signal: AbortSignal): Promise<VideoSample[]> => {
  const video = videoSamplingRuntime.createVideo()
  const url = videoSamplingRuntime.createUrl(blob)
  video.muted = true
  video.playsInline = true
  video.preload = 'auto'
  const waiting = {
    signal,
    video,
  }
  try {
    await waitForMedia({
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
        await waitForMedia({
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
    video.pause()
    video.removeAttribute('src')
    video.load()
    videoSamplingRuntime.releaseUrl(url)
  }
}
