import {type Accessor, createResource, createSignal} from 'solid-js'

import {
  loadBundledPAlbums,
  loadPublishedPAlbums,
  type PPublishedAlbumCatalog,
  type PResolvedAlbum,
} from '../../features/focus-room-audio'
import {getLocale} from '@paraglide/runtime'

export interface AlbumLibraryController {
  readonly albums: Accessor<readonly PResolvedAlbum[]>
  readonly catalogError: Accessor<Error | null>
  readonly isCatalogRetrying: Accessor<boolean>
  readonly retryCatalog: () => Promise<void>
  readonly retryLibrary: () => Promise<void>
}

export const useAlbumLibrary = (): AlbumLibraryController => {
  const [bundledAlbums, {refetch: refetchBundledAlbums}] = createResource(() =>
    loadBundledPAlbums({locale: getLocale()}),
  )
  const [publishedCatalog, {refetch: refetchPublishedCatalog}] = createResource(() =>
    loadPublishedPAlbums({locale: getLocale()}),
  )
  const [isCatalogRetrying, setIsCatalogRetrying] = createSignal(false)
  const getPublishedCatalog = (): PPublishedAlbumCatalog | undefined => {
    const {state} = publishedCatalog

    if (state === 'errored') {
      throw publishedCatalog.error
    }

    return state === 'ready' || state === 'refreshing' ? publishedCatalog.latest : undefined
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
      await refetchPublishedCatalog()
    } catch {
      // The resource preserves unexpected retry errors for the ErrorBoundary.
    } finally {
      setIsCatalogRetrying(false)
    }
  }
  const retryLibrary = async () => {
    try {
      await Promise.all([refetchBundledAlbums(), refetchPublishedCatalog()])
    } catch {
      // The resources preserve retry errors for the ErrorBoundary to render after reset.
    }
  }

  return {albums, catalogError, isCatalogRetrying, retryCatalog, retryLibrary}
}
