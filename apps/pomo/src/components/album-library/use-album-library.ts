import {type Accessor, createResource, createSignal, onCleanup, onMount} from 'solid-js'
import {createAsync, revalidate} from '@solidjs/router'

import {
  loadBundledPAlbums,
  type PPublishedAlbumCatalog,
  type PResolvedAlbum,
  publishedAlbumCatalogQuery,
} from '../../features/focus-room-audio'
import {
  deleteCustomAlbum as deleteCustomAlbumFromStorage,
  readCustomAlbums,
  type ResolvedCustomAlbum,
} from '../../features/custom-albums'
import {getLocale} from '@paraglide/runtime'

export interface AlbumLibraryController {
  readonly albums: Accessor<readonly PResolvedAlbum[]>
  readonly catalogError: Accessor<Error | null>
  readonly customAlbumError: Accessor<Error | null>
  readonly customAlbums: Accessor<readonly ResolvedCustomAlbum[]>
  readonly deleteCustomAlbum: (albumId: string) => Promise<void>
  readonly isCustomAlbumsLoading: Accessor<boolean>
  readonly isCatalogRetrying: Accessor<boolean>
  readonly reloadCustomAlbums: () => Promise<void>
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
  const [customAlbums, setCustomAlbums] = createSignal<readonly ResolvedCustomAlbum[]>([])
  const [customAlbumError, setCustomAlbumError] = createSignal<Error | null>(null)
  const [isCustomAlbumsLoading, setIsCustomAlbumsLoading] = createSignal(true)
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
  const reloadCustomAlbums = async () => {
    setIsCustomAlbumsLoading(true)
    setCustomAlbumError(null)

    try {
      const albums = await readCustomAlbums()

      if (!isDisposed) {
        setCustomAlbums(albums)
      }
    } catch (error: unknown) {
      if (!isDisposed) {
        setCustomAlbumError(
          error instanceof Error ? error : new Error('Failed to read custom albums.'),
        )
      }
    } finally {
      if (!isDisposed) {
        setIsCustomAlbumsLoading(false)
      }
    }
  }
  const deleteCustomAlbum = async (albumId: string) => {
    await deleteCustomAlbumFromStorage(albumId)

    if (!isDisposed) {
      setCustomAlbums((albums) => albums.filter((album) => album.id !== albumId))
      setCustomAlbumError(null)
    }
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
      await Promise.all([refetchBundledAlbums(), refreshPublishedCatalog(), reloadCustomAlbums()])
    } catch {
      // Bundled album errors use the boundary, while catalog errors use the inline banner.
    }
  }

  onMount(() => {
    setCatalogActive(true)
    reloadCustomAlbums()
  })
  onCleanup(() => {
    isDisposed = true
  })

  return {
    albums,
    catalogError,
    customAlbumError,
    customAlbums,
    deleteCustomAlbum,
    isCatalogRetrying,
    isCustomAlbumsLoading,
    reloadCustomAlbums,
    retryCatalog,
    retryLibrary,
  }
}
