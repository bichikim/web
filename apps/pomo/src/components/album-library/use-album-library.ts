import {type Accessor, createResource, createSignal, onCleanup, onMount} from 'solid-js'
import {createAsync, revalidate} from '@solidjs/router'
import {toError} from 'src/utils/to-error'

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
import {getAppLocale} from 'src/features/locale'

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

const refreshPublishedCatalog = async () => {
  await revalidate(publishedAlbumCatalogQuery.keyFor(getAppLocale()))
}

export const useAlbumLibrary = (): AlbumLibraryController => {
  const [catalogActive, setCatalogActive] = createSignal(false)
  const [bundledAlbums, {refetch: refetchBundledAlbums}] = createResource(
    getAppLocale,
    async (locale) => ({albums: await loadBundledPAlbums({locale}), locale}),
  )
  const [publishedCatalogState, setPublishedCatalogState] = createSignal<PublishedCatalogLoadState>(
    {kind: 'pending'},
  )
  const [customAlbums, setCustomAlbums] = createSignal<readonly ResolvedCustomAlbum[]>([])
  const [customAlbumError, setCustomAlbumError] = createSignal<Error | null>(null)
  const [isCustomAlbumsLoading, setIsCustomAlbumsLoading] = createSignal(true)
  let isDisposed = false
  let latestCustomAlbumLoad = 0
  let latestPublishedCatalogLoad = 0
  createAsync(async () => {
    if (!catalogActive()) {
      return
    }

    const locale = getAppLocale()
    const version = (latestPublishedCatalogLoad += 1)
    const isCurrent = () => !isDisposed && version === latestPublishedCatalogLoad
    setPublishedCatalogState({kind: 'pending'})
    try {
      const catalog = await publishedAlbumCatalogQuery(locale)

      if (isCurrent()) {
        setPublishedCatalogState({catalog, kind: 'resolved'})
      }

      return catalog
    } catch (error: unknown) {
      if (isCurrent()) {
        setPublishedCatalogState({
          error: toError(error, 'Published focus-room albums request failed'),
          kind: 'rejected',
        })
      }

      throw error
    }
  })
  const [isCatalogRetrying, setIsCatalogRetrying] = createSignal(false)
  const reloadCustomAlbums = async () => {
    latestCustomAlbumLoad += 1
    const version = latestCustomAlbumLoad
    const isCurrent = () => !isDisposed && version === latestCustomAlbumLoad
    setIsCustomAlbumsLoading(true)
    setCustomAlbumError(null)

    try {
      const albums = await readCustomAlbums()

      if (isCurrent()) {
        setCustomAlbums(albums)
      }
    } catch (error: unknown) {
      if (isCurrent()) {
        setCustomAlbumError(
          error instanceof Error ? error : new Error('Failed to read custom albums.'),
        )
      }
    } finally {
      if (isCurrent()) {
        setIsCustomAlbumsLoading(false)
      }
    }
  }
  const deleteCustomAlbum = async (albumId: string) => {
    await deleteCustomAlbumFromStorage(albumId)

    if (!isDisposed) {
      setCustomAlbums((albums) => albums.filter((album) => album.id !== albumId))
      await reloadCustomAlbums()
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

    if (bundled === undefined || bundled.locale !== getAppLocale()) {
      return []
    }

    return published?.status === 'ready' ? [...bundled.albums, ...published.albums] : bundled.albums
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
