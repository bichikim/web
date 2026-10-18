import {replaceBlobObjectUrl} from 'src/features/blob-object-url'

export interface VideoSamplingRuntime {
  readonly createCanvas: () => HTMLCanvasElement
  readonly createVideo: () => HTMLVideoElement
  readonly createUrl: (blob: Blob) => string
  readonly releaseUrl: (url: string) => void
}

export const videoSamplingRuntime: VideoSamplingRuntime = {
  createCanvas: () => document.createElement('canvas'),
  createUrl: (blob) => replaceBlobObjectUrl(null, () => blob),
  createVideo: () => document.createElement('video'),
  releaseUrl: (url) => {
    replaceBlobObjectUrl(url, () => null)
  },
}
