import {createMemo, createSignal, type JSX, onMount} from 'solid-js'

import {type AdminCatalog, type AlbumStatusAction, catalogSchema} from './catalog'
import {useAlbumDraft} from './use-album-draft'
import {useTrackManagement} from './use-track-management'

const readCatalog = async (): Promise<AdminCatalog> => {
  const response = await fetch('/api/admin/music')

  if (!response.ok) {
    throw new Error('음악 목록을 불러오지 못했습니다.')
  }

  return catalogSchema.parse(await response.json())
}

const postJson = async (url: string, body: Readonly<Record<string, unknown>>): Promise<void> => {
  const response = await fetch(url, {
    body: JSON.stringify(body),
    headers: {'Content-Type': 'application/json'},
    method: 'POST',
  })

  if (!response.ok) {
    throw new Error('저장하지 못했습니다. 입력값과 로그인 상태를 확인해 주세요.')
  }
}

export const useAdminMusic = () => {
  const [catalog, setCatalog] = createSignal<AdminCatalog>({
    albums: [],
    assets: [],
    offers: [],
    pendingTracks: [],
    tracks: [],
  })
  const [isLoading, setIsLoading] = createSignal(true)
  const [isSavingOffer, setIsSavingOffer] = createSignal(false)
  const [isAlbumEditorOpen, setIsAlbumEditorOpen] = createSignal(false)
  const [selectedAlbumId, setSelectedAlbumId] = createSignal<string | null>(null)
  const [updatingAlbumId, setUpdatingAlbumId] = createSignal<string | null>(null)
  const [message, setMessage] = createSignal<string | null>(null)

  const refreshCatalog = async (): Promise<void> => {
    const nextCatalog = await readCatalog()
    setCatalog(nextCatalog)
    setSelectedAlbumId((currentAlbumId) =>
      nextCatalog.albums.some((album) => album.id === currentAlbumId)
        ? currentAlbumId
        : (nextCatalog.albums[0]?.id ?? null),
    )
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
  const selectedAlbum = createMemo(
    () => catalog().albums.find((album) => album.id === selectedAlbumId()) ?? null,
  )
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

  onMount(async () => {
    try {
      await refreshCatalog()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '음악 목록을 불러오지 못했습니다.')
    } finally {
      setIsLoading(false)
    }
  })

  const handleAlbumStatusChange = async (
    albumId: string,
    action: AlbumStatusAction,
  ): Promise<void> => {
    setUpdatingAlbumId(albumId)
    setMessage(null)

    try {
      await postJson('/api/admin/music/status', {action, albumId})
      await refreshCatalog()
      setMessage(action === 'publish' ? '앨범을 공개했습니다.' : '앨범을 보관했습니다.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '앨범 상태를 변경하지 못했습니다.')
    } finally {
      setUpdatingAlbumId(null)
    }
  }

  const handleOfferSubmit: JSX.EventHandler<HTMLFormElement, SubmitEvent> = async (event) => {
    event.preventDefault()
    const offerForm = event.currentTarget
    const form = new FormData(offerForm)
    setIsSavingOffer(true)
    setMessage(null)

    try {
      await postJson('/api/admin/music/offers', {
        albumId: String(form.get('albumId') ?? ''),
        externalProductId: String(form.get('externalProductId') ?? ''),
        provider: 'apps-in-toss',
      })
      offerForm.reset()
      await refreshCatalog()
      setMessage('앱인토스 일회성 판매 상품을 연결했습니다.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '판매 상품을 연결하지 못했습니다.')
    } finally {
      setIsSavingOffer(false)
    }
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
    isLoading,
    isSavingOffer,
    message,
    selectedAlbum,
    selectedAlbumId,
    setIsAlbumEditorOpen,
    setSelectedAlbumId,
    updatingAlbumId,
  }
}

export type AdminMusicModel = ReturnType<typeof useAdminMusic>
