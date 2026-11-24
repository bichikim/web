import type {SettingsRepository} from '@winter-love/wallpaper/settings/repository'
import {type Accessor, createEffect, createSignal, onCleanup} from 'solid-js'
import type {FrameAlphaSample} from '@winter-love/puppet/player'

interface UseWidgetSilhouetteOptions {
  /** Identifies the selected model, or null before selection. */
  readonly assetId: Accessor<string | null>
  /** Loads a cached image for the selected model. */
  readonly load: SettingsRepository['loadPuppetSilhouette']
  /** Saves an image with the identity of the model that produced it. */
  readonly save: SettingsRepository['savePuppetSilhouette']
}

interface SilhouetteRequest {
  readonly id: string
  readonly show: (image: Blob) => void
  needsCapture: boolean
}
interface DisplayedSilhouette {
  readonly id: string
  readonly url: string
}

const RGBA_CHANNELS = 4
const ALPHA_CHANNEL = 3

const encode = (frame: FrameAlphaSample): Promise<Blob | null> => {
  const canvas = document.createElement('canvas')
  canvas.width = frame.width
  canvas.height = frame.height
  const context = canvas.getContext('2d')
  if (context === null) {
    return Promise.resolve(null)
  }
  const image = context.createImageData(frame.width, frame.height)
  for (let pixel = 0; pixel < frame.data.length; pixel += 1) {
    image.data[pixel * RGBA_CHANNELS + ALPHA_CHANNEL] = frame.data[pixel]!
  }
  context.putImageData(image, 0, 0)
  return new Promise((resolve) => {
    canvas.toBlob(resolve, 'image/png')
  })
}

/** Saves the first visible alpha sample as an imported character's loading image. */
export const useWidgetSilhouette = (options: UseWidgetSilhouetteOptions) => {
  const [source, setSource] = createSignal<DisplayedSilhouette | null>(null)
  let active: SilhouetteRequest | null = null
  createEffect(() => {
    const id = options.assetId()
    setSource(null)
    if (id === null || id.startsWith('builtin:')) {
      return
    }
    let url: string | null = null
    const show = (image: Blob) => {
      if (active === request) {
        url = URL.createObjectURL(image)
        setSource({id, url})
      }
    }
    const request: SilhouetteRequest = {id, needsCapture: false, show}
    active = request
    options
      .load(id)
      .then((image) => {
        if (image === undefined) {
          request.needsCapture = true
        } else {
          show(image)
        }
      })
      .catch(() => undefined)
    onCleanup(() => {
      active = null
      if (url !== null) {
        URL.revokeObjectURL(url)
      }
    })
  })
  return {
    capture(frame: FrameAlphaSample): Promise<void> | undefined {
      const request = active
      if (!request?.needsCapture || !frame.data.some((value) => value > 0)) {
        return
      }
      request.needsCapture = false
      const reuseOrSave = async () => {
        const cached = await options.load(request.id)
        if (cached !== undefined) {
          request.show(cached)
          return
        }
        const image = await encode(frame)
        if (image !== null) {
          await options.save(request.id, image)
          request.show(image)
        }
      }
      // Another widget may have saved the image since this widget checked the cache.
      const {locks} = navigator
      const work =
        locks === undefined
          ? reuseOrSave()
          : locks.request(`wallpaper:puppet-silhouette:${request.id}`, reuseOrSave)
      return work.catch(() => undefined)
    },
    needsCapture: () => active?.needsCapture === true,
    silhouette: () => {
      const image = source()
      return image !== null && image.id === options.assetId() ? image.url : null
    },
  }
}
