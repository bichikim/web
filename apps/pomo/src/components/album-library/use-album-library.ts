import {type Accessor, createResource, createSignal, onCleanup, onMount} from 'solid-js'
import {createAsync, revalidate} from '@solidjs/router'

import {
  loadBundledPAlbums,
  type PPublishedAlbumCatalog,
  type PResolvedAlbum,
  publishedAlbumCatalogQuery,
} from '../../features/focus-room-audio'
import {getLocale} from '@paraglide/runtime'

export interface AlbumLibraryController {
  readonly albums: Accessor<readonly PResolvedAlbum[]>
  readonly catalogError: Accessor<Error | null>
  readonly isCatalogRetrying: Accessor<boolean>
  readonly retryCatalog: () => Promise<void>
  readonly retryLibrary: () => Promise<void>
}

type PublishedCatalogLoadState =
  | {readonly error: unknown; readonly kind: 'rejected'}
  | {readonly kind: 'pending'}
  | {readonly catalog: PPublishedAlbumCatalog; readonly kind: 'resolved'}

export const useAlbumLibrary = (): AlbumLibraryController => {
  const locale = getLocale()
  const [catalogActive, setCatalogActive] = createSignal(false)
  const [bundledAlbums, {refetch: refetchBundledAlbums}] = createResource(() =>
    loadBundledPAlbums({locale}),
  )
  const [publishedCatalogState, setPublishedCatalogState] = createSignal<PublishedCatalogLoadState>(
    {kind: 'pending'},
  )
  let isDisposed = false
  createAsync(async () => {
    if (!catalogActive()) {
      return
    }

    try {
      const catalog = await publishedAlbumCatalogQuery(locale)

      if (!isDisposed) {
        setPublishedCatalogState({catalog, kind: 'resolved'})
      }

      return catalog
    } catch (error: unknown) {
      if (!isDisposed) {
        setPublishedCatalogState({error, kind: 'rejected'})
      }

      throw error
    }
  })
  const [isCatalogRetrying, setIsCatalogRetrying] = createSignal(false)
  const refreshPublishedCatalog = async () => {
    await revalidate(publishedAlbumCatalogQuery.keyFor(locale))
  }
  const getPublishedCatalog = (): PPublishedAlbumCatalog | undefined => {
    const state = publishedCatalogState()

    if (state.kind === 'rejected') {
      throw state.error
    }

    return state.kind === 'resolved' ? state.catalog : undefined
  }
  const albums = () => {
    const bundled = bundledAlbums()
    const published = getPublishedCatalog()

    if (bundled === undefined) {
      return []
    }

    return published?.status === 'ready' ? [...bundled, ...published.albums] : bundled
  }
  const catalogError = () => {
    const catalog = getPublishedCatalog()
    return catalog?.status === 'failed' ? catalog.error : null
  }
  const retryCatalog = async () => {
    if (isCatalogRetrying()) {
      return
    }

    setIsCatalogRetrying(true)

    try {
      await refreshPublishedCatalog()
    } catch {
      // The resource preserves unexpected retry errors for the ErrorBoundary.
    } finally {
      setIsCatalogRetrying(false)
    }
  }
  const retryLibrary = async () => {
    try {
      await Promise.all([refetchBundledAlbums(), refreshPublishedCatalog()])
    } catch {
      // The resources preserve retry errors for the ErrorBoundary to render after reset.
    }
  }

  onMount(() => setCatalogActive(true))
  onCleanup(() => {
    isDisposed = true
  })

  return {albums, catalogError, isCatalogRetrying, retryCatalog, retryLibrary}
}
