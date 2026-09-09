import type {MediaKind} from '../background'

const LOAD_TIMEOUT = 30_000

export interface MediaOptions {
  readonly blob: Blob
  readonly kind: MediaKind
  readonly onEnded: () => void
  readonly onError: () => void
}

export interface MediaResource {
  readonly source: HTMLImageElement | HTMLVideoElement
  readonly video: HTMLVideoElement | null
  readonly ready: Promise<boolean>
  readonly cancel: () => void
  readonly dispose: () => void
}

/** Owns a media URL, loading deadline and DOM listeners until disposed; cancellation resolves readiness false. */
export const createMedia = (options: MediaOptions): MediaResource => {
  const source = options.kind === 'photo' ? new Image() : document.createElement('video')
  const video = source instanceof HTMLVideoElement ? source : null
  const url = URL.createObjectURL(options.blob)
  let disposed = false
  let cancelled = false
  let loaded = false
  let settled = false
  let resolve!: (value: boolean) => void
  const ready = new Promise<boolean>((finish) => {
    resolve = finish
  })
  const settle = (value: boolean) => {
    if (settled) {
      return
    }
    settled = true
    loaded = value
    clearTimeout(timeout)
    resolve(value)
  }
  const onReady = () => settle(true)
  const onError = () => {
    if (disposed || cancelled) {
      return
    }
    if (loaded) {
      options.onError()
    } else {
      settle(false)
    }
  }
  const onEnded = () => {
    if (!disposed && !cancelled) {
      options.onEnded()
    }
  }
  const cancel = () => {
    cancelled = true
    settle(false)
  }
  const dispose = () => {
    if (disposed) {
      return
    }
    disposed = true
    cancel()
    source.removeEventListener('load', onReady)
    source.removeEventListener('loadeddata', onReady)
    source.removeEventListener('error', onError)
    source.removeEventListener('ended', onEnded)
    video?.pause()
    source.removeAttribute('src')
    video?.load()
    URL.revokeObjectURL(url)
  }
  source.addEventListener(options.kind === 'photo' ? 'load' : 'loadeddata', onReady, {once: true})
  source.addEventListener('error', onError)
  source.addEventListener('ended', onEnded)
  const timeout = setTimeout(onError, LOAD_TIMEOUT)
  try {
    if (video !== null) {
      video.muted = true
      video.defaultMuted = true
      video.playsInline = true
      video.preload = 'auto'
    }
    source.src = url
    video?.load()
  } catch (error) {
    dispose()
    throw error
  }
  return {cancel, dispose, ready, source, video}
}
