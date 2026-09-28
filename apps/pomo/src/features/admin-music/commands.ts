import type {AlbumStatusAction} from './catalog'

interface ConnectAppsInTossAlbumOfferInput {
  readonly albumId: string
  readonly externalProductId: string
  readonly provider: 'apps-in-toss'
}

interface ConnectPaddleAlbumOfferInput {
  readonly albumId: string
  readonly amountMinor: string
  readonly currency: string
  readonly externalProductId: string
  readonly fractionalDigits: number
  readonly provider: 'paddle'
}

export type ConnectAlbumOfferInput = ConnectAppsInTossAlbumOfferInput | ConnectPaddleAlbumOfferInput

const postJson = async (url: string, body: object): Promise<void> => {
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

export const connectAlbumOffer = (input: ConnectAlbumOfferInput): Promise<void> =>
  postJson('/api/admin/music/offers', input)
