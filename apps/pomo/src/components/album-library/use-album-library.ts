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
  | {readonly error: Error; readonly kind: 'rejected'}
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
        setPublishedCatalogState({
          error:
            error instanceof Error
              ? error
              : new Error('Published focus-room albums request failed', {cause: error}),
          kind: 'rejected',
        })
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

    switch (state.kind) {
      case 'pending':
      case 'rejected':
        return undefined
      case 'resolved':
        return state.catalog
      default: {
        const unreachableState: never = state
        return unreachableState
      }
    }
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
    const state = publishedCatalogState()

    switch (state.kind) {
      case 'pending':
        return null
      case 'rejected':
        return state.error
      case 'resolved':
        return state.catalog.status === 'failed' ? state.catalog.error : null
      default: {
        const unreachableState: never = state
        return unreachableState
      }
    }
  }
  const retryCatalog = async () => {
    if (isCatalogRetrying()) {
      return
    }

    setIsCatalogRetrying(true)

    try {
      await refreshPublishedCatalog()
    } catch {
      // The rejected query state exposes catalog errors through the inline banner.
    } finally {
      setIsCatalogRetrying(false)
    }
  }
  const retryLibrary = async () => {
    try {
      await Promise.all([refetchBundledAlbums(), refreshPublishedCatalog()])
    } catch {
      // Bundled album errors use the boundary, while catalog errors use the inline banner.
    }
  }

  onMount(() => setCatalogActive(true))
  onCleanup(() => {
    isDisposed = true
  })

  return {albums, catalogError, isCatalogRetrying, retryCatalog, retryLibrary}
}
