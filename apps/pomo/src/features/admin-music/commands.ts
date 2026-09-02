import type {AlbumStatusAction} from './catalog'

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

export const changeAlbumStatus = (
  albumId: string,
  statusAction: AlbumStatusAction,
): Promise<void> => postJson('/api/admin/music/status', {action: statusAction, albumId})

export const connectAlbumOffer = (albumId: string, externalProductId: string): Promise<void> =>
  postJson('/api/admin/music/offers', {
    albumId,
    externalProductId,
    provider: 'apps-in-toss',
  })
