import {runEventTask} from 'src/utils/run-event-task'
import {videoSamplingRuntime} from './runtime'
import {sampleTimes} from './timeline'

const DECODE_TIMEOUT = 10_000
const SEEK_EPSILON = 0.001

export {type VideoSample} from '@winter-love/wallpaper/frame-renderer/capture-video-sample'
import {
  captureVideoSample,
  type VideoSample,
} from '@winter-love/wallpaper/frame-renderer/capture-video-sample'

export const captureSample = (video: HTMLVideoElement): VideoSample =>
  captureVideoSample({canvas: videoSamplingRuntime.createCanvas(), video})

/** Samples a separate muted decoder and releases it on completion, failure, or cancellation. */
export const sampleVideo = async (blob: Blob, signal: AbortSignal): Promise<VideoSample[]> => {
  const video = videoSamplingRuntime.createVideo()
  const url = videoSamplingRuntime.createUrl(blob)
  video.muted = true
  video.playsInline = true
  video.preload = 'auto'
  const waiting = {
    failureEvent: 'error',
    onAbort: () => {
      throw signal.reason
    },
    onFailure: (): never => {
      throw new Error('Video background decoding failed.')
    },
    onReady: () => undefined,
    signal,
    target: video,
    timeoutMs: DECODE_TIMEOUT,
  }
  try {
    await runEventTask({
      ...waiting,
      readyEvent: 'loadeddata',
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
        await runEventTask({
          ...waiting,
          readyEvent: 'seeked',
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
