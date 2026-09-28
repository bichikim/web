import {type Accessor, createMemo, createResource, createSignal, onCleanup, onMount} from 'solid-js'
import {createAsync, revalidate} from '@solidjs/router'

import {
  loadBundledPAlbums,
  loadOwnedPAlbums,
  type PPublishedAlbumCatalog,
  type PResolvedAlbum,
  publishedAlbumCatalogQuery,
} from '../../features/focus-room-audio'
import {listPaymentOrders, type PaymentOrderHistoryView} from '../../features/payment'
import {getLocale} from '@paraglide/runtime'

export interface AlbumLibraryController {
  readonly albums: Accessor<readonly PResolvedAlbum[]>
  readonly catalogError: Accessor<Error | null>
  readonly isCatalogRetrying: Accessor<boolean>
  readonly isPaymentOrdersLoading: Accessor<boolean>
  readonly paymentOrders: Accessor<readonly PaymentOrderHistoryView[] | undefined>
  readonly retryCatalog: () => Promise<void>
  readonly retryLibrary: () => Promise<void>
}

type PublishedCatalogLoadState =
  | {readonly error: unknown; readonly kind: 'rejected'}
  | {readonly kind: 'pending'}
  | {readonly catalog: PPublishedAlbumCatalog; readonly kind: 'resolved'}

const mergeAlbumCatalogs = (
  publicAlbums: readonly PResolvedAlbum[],
  ownedAlbums: readonly PResolvedAlbum[],
): readonly PResolvedAlbum[] => {
  const albumsById = new Map(publicAlbums.map((album) => [album.id, album]))

  for (const ownedAlbum of ownedAlbums) {
    const publicAlbum = albumsById.get(ownedAlbum.id)
    albumsById.set(
      ownedAlbum.id,
      publicAlbum === undefined ? ownedAlbum : {...publicAlbum, ...ownedAlbum, owned: true},
    )
  }

  return [...albumsById.values()]
}

export const useAlbumLibrary = (): AlbumLibraryController => {
  const locale = getLocale()
  const [catalogActive, setCatalogActive] = createSignal(false)
  const [bundledAlbums, {refetch: refetchBundledAlbums}] = createResource(() =>
    loadBundledPAlbums({locale}),
  )
  const [paymentOrders, setPaymentOrders] = createSignal<
    readonly PaymentOrderHistoryView[] | undefined
  >()
  const [isPaymentOrdersLoading, setIsPaymentOrdersLoading] = createSignal(false)
  const [ownedAlbums, setOwnedAlbums] = createSignal<readonly PResolvedAlbum[]>([])
  let isDisposed = false
  let paymentOrderRequestId = 0
  let ownedAlbumsRequestId = 0
  const refreshPaymentOrders = async () => {
    if (isDisposed) {
      return
    }

    paymentOrderRequestId += 1
    const requestId = paymentOrderRequestId
    setIsPaymentOrdersLoading(true)

    try {
      const orders = await listPaymentOrders()

      if (!isDisposed && requestId === paymentOrderRequestId) {
        setPaymentOrders(orders)
      }
    } catch {
      // Keep the last known ownership snapshot when the private history is unavailable.
    } finally {
      if (!isDisposed && requestId === paymentOrderRequestId) {
        setIsPaymentOrdersLoading(false)
      }
    }
  }
  const refreshOwnedAlbums = async () => {
    if (isDisposed) {
      return
    }

    ownedAlbumsRequestId += 1
    const requestId = ownedAlbumsRequestId

    try {
      const albums = await loadOwnedPAlbums({locale})

      if (!isDisposed && requestId === ownedAlbumsRequestId) {
        setOwnedAlbums(albums)
      }
    } catch {
      // Keep the last known owned catalog when the private catalog is unavailable.
    }
  }
  const [publishedCatalogState, setPublishedCatalogState] = createSignal<PublishedCatalogLoadState>(
    {kind: 'pending'},
  )
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
  const ownedProductIds = createMemo(
    () =>
      new Set(
        (paymentOrders() ?? [])
          .filter((order) => order.entitlementStatus === 'granted')
          .map((order) => order.productId),
      ),
  )
  const albums = () => {
    const bundled = bundledAlbums()
    const published = getPublishedCatalog()

    if (bundled === undefined) {
      return []
    }

    const publicAlbums = published?.status === 'ready' ? [...bundled, ...published.albums] : bundled
    const availableAlbums = mergeAlbumCatalogs(publicAlbums, ownedAlbums())

    return availableAlbums.map((album) =>
      album.productId !== undefined && ownedProductIds().has(album.productId)
        ? {...album, owned: true}
        : album,
    )
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
      await Promise.all([
        refetchBundledAlbums(),
        refreshOwnedAlbums(),
        refreshPaymentOrders(),
        refreshPublishedCatalog(),
      ])
    } catch {
      // The resources preserve retry errors for the ErrorBoundary to render after reset.
    }
  }

  onMount(() => {
    setCatalogActive(true)
    refreshOwnedAlbums().catch(() => undefined)
    refreshPaymentOrders().catch(() => undefined)
  })
  onCleanup(() => {
    isDisposed = true
  })

  return {
    albums,
    catalogError,
    isCatalogRetrying,
    isPaymentOrdersLoading,
    paymentOrders,
    retryCatalog,
    retryLibrary,
  }
}
