import {action} from '@solidjs/router'

import {ALBUM_LOCALES, type AlbumDraftData} from './album-draft'
import {albumCreationServices} from './album-creation-adapter'
import type {AlbumStatusAction} from './catalog'
import {changeAlbumStatus, connectAlbumOffer} from './commands'
import {createTrackWithAudio, removeTrack} from './track-creation'
import {confirmTrackAudioRegistration, validateTrackAudio} from './track-upload'
import {requestAdminTrackPlaybackAccess} from './track-playback-access'

type FormValues = FormData | URLSearchParams

interface CommandFailure {
  readonly detail: string
  readonly status: 'failed'
}

interface CommandSuccess {
  readonly status: 'succeeded'
}

export type AdminCommandResult = CommandFailure | CommandSuccess

interface AlbumCreated {
  readonly albumId: string
  readonly status: 'created'
}

interface AlbumCreationConflicted {
  readonly status: 'conflicted'
}

interface AlbumRejected {
  readonly detail: string
  readonly status: 'rejected'
}

export type CreateAlbumActionResult = AlbumCreated | AlbumCreationConflicted | AlbumRejected

interface TrackCreated {
  readonly status: 'created'
}

interface TrackCreationFailed {
  readonly cleanupStatus: 'failed' | 'preserved' | 'succeeded'
  readonly detail: string
  readonly status: 'failed'
}

interface TrackCreationRejected {
  readonly detail: string
  readonly status: 'rejected'
}

export type CreateTrackActionResult = TrackCreated | TrackCreationFailed | TrackCreationRejected

export type ConfirmTrackActionResult =
  | {readonly status: 'active'}
  | {readonly detail: string; readonly status: 'rejected'}
  | {readonly status: 'unconfirmed'}

export type AdminTrackPlaybackActionResult =
  | {readonly status: 'granted'; readonly url: string}
  | {readonly status: 'unavailable'}

const getString = (values: FormValues, name: string): string =>
  values.get(name)?.toString().trim() ?? ''

const getErrorDetail = (error: unknown, fallback: string): string =>
  error instanceof Error ? error.message : fallback

const createAlbumDraft = (values: FormValues): AlbumDraftData => ({
  albumId: getString(values, 'albumId') || undefined,
  coverDraftId: getString(values, 'coverDraftId') || null,
  coverFallback: getString(values, 'coverFallback') as AlbumDraftData['coverFallback'],
  coverImageUrl: getString(values, 'coverImageUrl'),
  hasCoverFile: values.get('coverFile') instanceof File,
  translations: Object.fromEntries(
    ALBUM_LOCALES.map((locale) => [
      locale,
      {
        description: getString(values, `description.${locale}`),
        title: getString(values, `title.${locale}`),
      },
    ]),
  ) as AlbumDraftData['translations'],
})

const runCreateAlbum = async (values: FormValues): Promise<CreateAlbumActionResult> => {
  const coverValue = values.get('coverFile')
  const coverFile = coverValue instanceof File && coverValue.size > 0 ? coverValue : null

  try {
    const result = await albumCreationServices.createAlbum(createAlbumDraft(values), coverFile)

    return result.success ? {albumId: result.albumId, status: 'created'} : {status: 'conflicted'}
  } catch (error: unknown) {
    return {detail: getErrorDetail(error, '앨범을 저장하지 못했습니다.'), status: 'rejected'}
  }
}

const runCreateTrack = async (values: FormValues): Promise<CreateTrackActionResult> => {
  const audio = values.get('audio')

  if (!(audio instanceof File)) {
    return {detail: 'MP3 파일을 선택해 주세요.', status: 'rejected'}
  }

  try {
    validateTrackAudio(audio)
    const result = await createTrackWithAudio({
      albumId: getString(values, 'albumId'),
      artist: getString(values, 'artist'),
      audio,
      title: getString(values, 'title'),
    })

    return result.success
      ? {status: 'created'}
      : {
          cleanupStatus: result.cleanupStatus,
          detail: getErrorDetail(result.error, '곡을 저장하지 못했습니다.'),
          status: 'failed',
        }
  } catch (error: unknown) {
    return {detail: getErrorDetail(error, '곡을 저장하지 못했습니다.'), status: 'rejected'}
  }
}

const runConnectOffer = async (values: FormValues): Promise<AdminCommandResult> => {
  try {
    await connectAlbumOffer(getString(values, 'albumId'), getString(values, 'externalProductId'))
    return {status: 'succeeded'}
  } catch (error: unknown) {
    return {detail: getErrorDetail(error, '판매 상품을 연결하지 못했습니다.'), status: 'failed'}
  }
}

const runChangeAlbumStatus = async (
  albumId: string,
  statusAction: AlbumStatusAction,
): Promise<AdminCommandResult> => {
  try {
    await changeAlbumStatus(albumId, statusAction)
    return {status: 'succeeded'}
  } catch (error: unknown) {
    return {detail: getErrorDetail(error, '앨범 상태를 변경하지 못했습니다.'), status: 'failed'}
  }
}

const runRemoveTrack = async (trackId: string): Promise<AdminCommandResult> => {
  try {
    await removeTrack(trackId)
    return {status: 'succeeded'}
  } catch (error: unknown) {
    return {detail: getErrorDetail(error, '수록곡을 삭제하지 못했습니다.'), status: 'failed'}
  }
}

const runConfirmTrack = async (assetId: string): Promise<ConfirmTrackActionResult> => {
  try {
    const result = await confirmTrackAudioRegistration(assetId)
    return result.status === 'active' ? result : {status: 'unconfirmed'}
  } catch (error: unknown) {
    return {detail: getErrorDetail(error, 'MP3 등록을 확인하지 못했습니다.'), status: 'rejected'}
  }
}

const runRequestTrackPlayback = async (
  trackId: string,
): Promise<AdminTrackPlaybackActionResult> => {
  try {
    const access = await requestAdminTrackPlaybackAccess(trackId)
    return {status: 'granted', url: access.url}
  } catch {
    return {status: 'unavailable'}
  }
}

export const createAdminAlbumAction = action(runCreateAlbum, 'create-admin-music-album')
export const createAdminTrackAction = action(runCreateTrack, 'create-admin-music-track')
export const connectAdminAlbumOfferAction = action(
  runConnectOffer,
  'connect-admin-music-album-offer',
)
export const changeAdminAlbumStatusAction = action(
  runChangeAlbumStatus,
  'change-admin-music-album-status',
)
export const removeAdminTrackAction = action(runRemoveTrack, 'remove-admin-music-track')
export const confirmAdminTrackAction = action(runConfirmTrack, 'confirm-admin-music-track')
export const requestAdminTrackPlaybackAction = action(
  runRequestTrackPlayback,
  'request-admin-music-track-playback',
)
