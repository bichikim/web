import type {BackgroundMedia} from './model'
import {getPairDirection, type PhotoSize} from './pairing'

const LOAD_TIMEOUT = 10_000
export interface LoadedPhoto {
  readonly image: HTMLImageElement
  readonly release: () => void
}
export interface FindCompanionOptions {
  readonly first: PhotoSize
  readonly viewport: PhotoSize
  readonly candidates: readonly BackgroundMedia[]
  readonly sizes: Map<string, PhotoSize>
  readonly signal: AbortSignal
  readonly load: (id: string) => Promise<Blob>
  readonly onError: (id: string) => void
}
export interface Companion extends LoadedPhoto {
  readonly id: string
}

/** Loads one cancellable photo; the receiver owns release after a successful load. */
export const loadPhoto = (blob: Blob, signal: AbortSignal): Promise<LoadedPhoto | null> => {
  if (signal.aborted) {
    return Promise.resolve(null)
  }
  const image = new Image()
  const url = URL.createObjectURL(blob)
  const release = () => {
    image.removeAttribute('src')
    URL.revokeObjectURL(url)
  }
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      clearTimeout(timer)
      signal.removeEventListener('abort', abort)
      image.onload = null
      image.onerror = null
    }
    const abort = () => {
      cleanup()
      release()
      resolve(null)
    }
    const fail = () => {
      cleanup()
      release()
      reject(new Error('Unable to load companion photo.'))
    }
    const timer = setTimeout(fail, LOAD_TIMEOUT)
    image.onload = () => {
      cleanup()
      resolve({image, release})
    }
    image.onerror = fail
    signal.addEventListener('abort', abort, {once: true})
    image.src = url
  })
}

/** Finds an unseen compatible photo, releasing rejected candidates and retaining only dimensions. */
export const findCompanion = async (options: FindCompanionOptions): Promise<Companion | null> => {
  return options.candidates.reduce<Promise<Companion | null>>(async (pending, item) => {
    const selected = await pending
    if (selected !== null || options.signal.aborted) {
      return selected
    }
    const known = options.sizes.get(item.id)
    const eligible =
      item.kind === 'photo' &&
      (known === undefined ||
        getPairDirection({first: options.first, second: known, viewport: options.viewport}) !==
          null)
    if (!eligible) {
      return null
    }
    try {
      const blob = await options.load(item.id)
      const photo = await loadPhoto(blob, options.signal)
      if (photo === null) {
        return null
      }
      const size = {height: photo.image.naturalHeight, width: photo.image.naturalWidth}
      options.sizes.set(item.id, size)
      const direction = getPairDirection({
        first: options.first,
        second: size,
        viewport: options.viewport,
      })
      if (!options.signal.aborted && direction !== null) {
        return {...photo, id: item.id}
      }
      photo.release()
    } catch {
      if (!options.signal.aborted) {
        options.onError(item.id)
      }
    }
    return null
  }, Promise.resolve(null))
}
