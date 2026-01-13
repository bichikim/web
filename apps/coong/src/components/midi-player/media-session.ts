import {Accessor, createEffect, onCleanup, onMount} from 'solid-js'

export interface MediaSessionProps {
  album: string
  artist: string
  artwork: string
  title: string
}

const DEFAULT_ALLOWED_EXTENSIONS = ['png', 'jpg', 'jpeg']

const getExtension = (type: string, allowedExtensions: string[] = DEFAULT_ALLOWED_EXTENSIONS): string | null => {
  const extension = type.split('/').pop()

  if (!extension) {
    return null
  }

  return allowedExtensions.includes(extension) ? extension : null
}

export interface MediaSessionArtwork {
  height?: number
  type?: string
  width: number
}

type Size = {
  height: number
  width: number
}

export type MediaSessionArtworkFactory = (url: string, sizes: Size, type: string) => string

export interface MediaSessionOptions {
  artworkFactory?: MediaSessionArtworkFactory
  artworks?: MediaSessionArtwork[]
}

const getArtwork = (
  src: string | undefined,
  artwork: MediaSessionArtwork,
  artworkFactory?: MediaSessionArtworkFactory,
) => {
  if (!src) {
    return null
  }

  if (artworkFactory) {
    return artworkFactory(
      src,
      {
        height: artwork.height ?? artwork.width,
        width: artwork.width,
      },
      artwork.type ?? 'image/png',
    )
  }

  return null
}

type NotNull<T> = T extends null | undefined ? never : T

const notNull = <T>(value: T): value is NotNull<T> => {
  return value !== null && value !== undefined
}

const getArtworks = (
  src: string | undefined,
  artworkFactory?: MediaSessionArtworkFactory,
  artworks: MediaSessionArtwork[] = [],
): MediaImage[] => {
  if (!src) {
    return []
  }

  return artworks
    .map((artwork) => {
      const artworkSrc = getArtwork(src, artwork, artworkFactory)

      if (!artworkSrc) {
        return null
      }

      return {
        sizes: `${artwork.width}x${artwork.height}`,
        src: artworkSrc,
        type: artwork.type ?? 'image/png',
      }
    })
    .filter(notNull)
}

const ACTION_HANDLER_KEY = Symbol('action-handler')

type ActionHandlerInfo = Record<MediaSessionAction, boolean>

const useActionHandler = (action: MediaSessionAction, handler: MediaSessionActionHandler | null) => {
  onMount(() => {
    const prevInfo: ActionHandlerInfo = (window as any)[ACTION_HANDLER_KEY] ?? {}

    if (prevInfo[action]) {
      console.warn(`Action ${action} is already handled`)

      return
    }

    prevInfo[action] = true
    ;(window as any)[ACTION_HANDLER_KEY] = prevInfo

    try {
      navigator.mediaSession.setActionHandler(action, handler)
    } catch {
      console.info(`Failed to set action handler for ${action}`)
    }
  })

  onCleanup(() => {
    const prevInfo: ActionHandlerInfo = (window as any)[ACTION_HANDLER_KEY] ?? {}

    prevInfo[action] = false
    ;(window as any)[ACTION_HANDLER_KEY] = prevInfo

    try {
      navigator.mediaSession.setActionHandler(action, null)
    } catch {
      // skip
    }
  })
}

export const useMediaMetadata = (props: Accessor<MediaSessionProps>, options: MediaSessionOptions = {}) => {
  createEffect(() => {
    if (!navigator.mediaSession) {
      return
    }

    const metadata = props()

    const artworks = getArtworks(metadata.artwork, options.artworkFactory, options.artworks)

    if (metadata) {
      navigator.mediaSession.metadata = new MediaMetadata({
        album: metadata.album,
        artist: metadata.artist,
        artwork: artworks,
        title: metadata.title,
      })
    }
  })
}

export const useMediaPlayback = (pause: Accessor<boolean>) => {
  createEffect(() => {
    if (!navigator.mediaSession) {
      return
    }

    navigator.mediaSession.playbackState = pause() ? 'paused' : 'playing'
  })
}
