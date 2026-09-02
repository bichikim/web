import {createAsync, revalidate, useAction, useSubmission, useSubmissions} from '@solidjs/router'
import {createEffect, createMemo, createSignal, type JSX, onMount} from 'solid-js'

import {changeAdminAlbumStatusAction, connectAdminAlbumOfferAction} from './actions'
import {type AdminCatalog, type AlbumStatusAction} from './catalog'
import {adminCatalogQuery} from './catalog-query'
import {useAlbumDraft} from './use-album-draft'
import {useTrackManagement} from './use-track-management'

export const useAdminMusic = () => {
  const changeAlbumStatus = useAction(changeAdminAlbumStatusAction)
  const albumStatusSubmissions = useSubmissions(changeAdminAlbumStatusAction)
  const connectOffer = useAction(connectAdminAlbumOfferAction)
  const offerSubmission = useSubmission(connectAdminAlbumOfferAction)
  const [catalog, setCatalog] = createSignal<AdminCatalog>({
    albums: [],
    assets: [],
    offers: [],
    pendingTracks: [],
    tracks: [],
  })
  const [catalogActive, setCatalogActive] = createSignal(false)
  const [catalogLoading, setCatalogLoading] = createSignal(true)
  const [isAlbumEditorOpen, setIsAlbumEditorOpen] = createSignal(false)
  const [selectedAlbumId, setSelectedAlbumId] = createSignal<string | null>(null)
  const [message, setMessage] = createSignal<string | null>(null)

  const catalogResult = createAsync(async () => {
    if (!catalogActive()) {
      return
    }

    return adminCatalogQuery()
  })
  const applyCatalog = (nextCatalog: AdminCatalog): void => {
    setCatalog(nextCatalog)
    setSelectedAlbumId((currentAlbumId) =>
      nextCatalog.albums.some((album) => album.id === currentAlbumId)
        ? currentAlbumId
        : (nextCatalog.albums[0]?.id ?? null),
    )
  }
  const refreshCatalog = async (): Promise<void> => {
    await revalidate(adminCatalogQuery.key)
    const result = await adminCatalogQuery()

    if (result.status === 'failed') {
      throw new Error(result.message)
    }

    applyCatalog(result.catalog)
  }

  const albumDraft = useAlbumDraft({
    onAlbumCreated: (albumId) => {
      setSelectedAlbumId(albumId)
      setIsAlbumEditorOpen(false)
    },
    refreshCatalog,
    setMessage,
  })
  const trackManagement = useTrackManagement({refreshCatalog, setMessage})
  const albumStats = createMemo(() => {
    const {albums} = catalog()

    return {
      draft: albums.filter((album) => album.status === 'draft').length,
      published: albums.filter((album) => album.status === 'published').length,
      total: albums.length,
    }
  })
  const getTrackCount = (albumId: string): number => {
    const currentCatalog = catalog()
    const albumTrackIds = new Set(
      currentCatalog.tracks.filter((track) => track.albumId === albumId).map((track) => track.id),
    )

    return currentCatalog.assets.filter(
      (asset) => asset.status === 'active' && albumTrackIds.has(asset.trackId),
    ).length
  }

  createEffect(() => {
    const result = catalogResult()

    if (result?.status === 'ready') {
      setCatalogLoading(false)
      applyCatalog(result.catalog)
      return
    }

    if (result?.status === 'failed') {
      setCatalogLoading(false)
      setMessage(result.message)
    }
  })

  onMount(() => setCatalogActive(true))

  const handleAlbumStatusChange = async (
    albumId: string,
    action: AlbumStatusAction,
  ): Promise<void> => {
    setMessage(null)
    const result = await changeAlbumStatus(albumId, action)
    if (result.status === 'succeeded') {
      await refreshCatalog()
      setMessage(action === 'publish' ? '앨범을 공개했습니다.' : '앨범을 보관했습니다.')
      return
    }

    setMessage(result.detail)
  }

  const handleOfferSubmit: JSX.EventHandler<HTMLFormElement, SubmitEvent> = async (event) => {
    event.preventDefault()
    const offerForm = event.currentTarget
    const form = new FormData(offerForm)
    setMessage(null)
    const result = await connectOffer(form)
    if (result.status === 'succeeded') {
      offerForm.reset()
      await refreshCatalog()
      setMessage('앱인토스 일회성 판매 상품을 연결했습니다.')
      return
    }

    setMessage(result.detail)
  }

  return {
    ...albumDraft,
    ...trackManagement,
    albumStats,
    catalog,
    getTrackCount,
    handleAlbumStatusChange,
    handleOfferSubmit,
    isAlbumEditorOpen,
    isLoading: catalogLoading,
    isSavingOffer: () => offerSubmission.pending === true,
    isUpdatingAlbum: (albumId: string) =>
      albumStatusSubmissions.some(
        (submission) => submission.pending && submission.input[0] === albumId,
      ),
    message,
    selectedAlbumId,
    setIsAlbumEditorOpen,
    setSelectedAlbumId,
    updatingAlbumId: () =>
      albumStatusSubmissions.findLast((submission) => submission.pending)?.input[0] ?? null,
  }
}

export type AdminMusicModel = ReturnType<typeof useAdminMusic>
