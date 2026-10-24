import {type Accessor, createEffect, createSignal, onCleanup, useContext} from 'solid-js'
import type {CodeDocument} from '../shared/contracts'
import type {ViewerPort} from './types'
import {createMediaCache} from './create-media-cache'
import {MediaCacheContext} from './media-cache-context'
import {readMediaBlob} from './read-media-blob'

interface MediaUrlOptions {
  document: Accessor<CodeDocument | undefined>
  session: Accessor<string>
  port: Accessor<ViewerPort | undefined>
  onError?: (error: unknown) => void
}
export const useMediaUrl = (options: MediaUrlOptions) => {
  const shared = useContext(MediaCacheContext)
  const cache = shared ?? createMediaCache({maxBytes: 0, maxEntries: 0})
  if (shared === undefined) {
    onCleanup(cache.clear)
  }
  const [url, setUrl] = createSignal<string>()
  const [blob, setBlob] = createSignal<Blob>()
  const [progress, setProgress] = createSignal(0)
  const [error, setError] = createSignal<string>()
  createEffect(() => {
    const document = options.document()
    const session = options.session()
    setUrl(undefined)
    setBlob(undefined)
    setProgress(0)
    setError(undefined)
    const port = options.port()
    if (document?.media === undefined || port === undefined) {
      return
    }
    const {media} = document
    let disposed = false
    let objectUrl: string | undefined
    const lease = cache.acquire({
      load: (request) => readMediaBlob({...request, document, port, session}),
      mimeType: media.mimeType,
      onProgress: (percent) => {
        if (!disposed) {
          setProgress(percent)
        }
      },
      path: document.location.path,
      revision: document.revision,
      session,
      size: media.size,
    })
    onCleanup(() => {
      disposed = true
      lease.release()
      if (objectUrl !== undefined) {
        URL.revokeObjectURL(objectUrl)
      }
    })
    lease.result
      .then((blob) => {
        if (!disposed) {
          objectUrl = URL.createObjectURL(blob)
          setBlob(blob)
          setUrl(objectUrl)
        }
      })
      .catch((reason: unknown) => {
        if (!disposed) {
          setError(reason instanceof Error ? reason.message : '미디어를 읽지 못했습니다.')
          options.onError?.(reason)
        }
      })
  })
  return {blob, error, progress, url}
}
