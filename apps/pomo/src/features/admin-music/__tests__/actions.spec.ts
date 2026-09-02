/** @vitest-environment jsdom */

import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

const albumMocks = vi.hoisted(() => ({createAlbum: vi.fn()}))
const commandMocks = vi.hoisted(() => ({
  changeAlbumStatus: vi.fn(),
  connectAlbumOffer: vi.fn(),
}))
const creationMocks = vi.hoisted(() => ({createTrackWithAudio: vi.fn(), removeTrack: vi.fn()}))
const uploadMocks = vi.hoisted(() => ({
  confirmTrackAudioRegistration: vi.fn(),
  validateTrackAudio: vi.fn(),
}))
const playbackMocks = vi.hoisted(() => ({requestAdminTrackPlaybackAccess: vi.fn()}))

vi.mock('@solidjs/router', () => ({action: vi.fn((clientAction) => clientAction)}))
vi.mock('../album-creation', () => albumMocks)
vi.mock('../commands', () => commandMocks)
vi.mock('../track-creation', () => creationMocks)
vi.mock('../track-upload', () => uploadMocks)
vi.mock('../track-playback-access', () => playbackMocks)

import {
  changeAdminAlbumStatusAction,
  confirmAdminTrackAction,
  connectAdminAlbumOfferAction,
  createAdminAlbumAction,
  createAdminTrackAction,
  removeAdminTrackAction,
  requestAdminTrackPlaybackAction,
} from '../actions'

const AUDIO = new File(['audio'], 'track.mp3', {type: 'audio/mpeg'})

beforeEach(() => {
  vi.resetAllMocks()
  albumMocks.createAlbum.mockResolvedValue('album-one')
  commandMocks.changeAlbumStatus.mockResolvedValue(undefined)
  commandMocks.connectAlbumOffer.mockResolvedValue(undefined)
  creationMocks.createTrackWithAudio.mockResolvedValue({success: true})
  creationMocks.removeTrack.mockResolvedValue(undefined)
  uploadMocks.confirmTrackAudioRegistration.mockResolvedValue({status: 'active'})
  playbackMocks.requestAdminTrackPlaybackAccess.mockResolvedValue({
    expiresAt: '2026-09-02T12:00:00.000Z',
    url: 'https://audio.example/track.mp3',
  })
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('form actions', () => {
  it('should convert album form values and preserve the cover upload workflow input', async () => {
    const values = new FormData()
    values.set('coverDraftId', 'cover-draft')
    values.set('coverFallback', 'music')
    values.set('coverImageUrl', ' https://images.example/cover.webp ')
    values.set('coverFile', new File(['cover'], 'cover.webp', {type: 'image/webp'}))
    values.set('title.ko', ' 한국어 제목 ')
    values.set('description.ko', ' 한국어 설명 ')

    await expect(createAdminAlbumAction(values)).resolves.toEqual({
      albumId: 'album-one',
      status: 'created',
    })
    expect(albumMocks.createAlbum).toHaveBeenCalledWith(
      expect.objectContaining({
        coverDraftId: 'cover-draft',
        coverFallback: 'music',
        coverImageUrl: 'https://images.example/cover.webp',
        translations: expect.objectContaining({
          ko: {description: '한국어 설명', title: '한국어 제목'},
        }),
      }),
      expect.any(File),
    )
  })

  it('should return track partial-failure cleanup state without discarding detail', async () => {
    creationMocks.createTrackWithAudio.mockResolvedValueOnce({
      cleanupStatus: 'preserved',
      error: new Error('completion unknown'),
      success: false,
    })
    const values = new FormData()
    values.set('albumId', 'album-one')
    values.set('artist', ' Artist ')
    values.set('audio', AUDIO)
    values.set('title', ' Title ')

    await expect(createAdminTrackAction(values)).resolves.toEqual({
      cleanupStatus: 'preserved',
      detail: 'completion unknown',
      status: 'failed',
    })
    expect(uploadMocks.validateTrackAudio).toHaveBeenCalledWith(AUDIO)
    expect(creationMocks.createTrackWithAudio).toHaveBeenCalledWith({
      albumId: 'album-one',
      artist: 'Artist',
      audio: AUDIO,
      title: 'Title',
    })
  })

  it('should create a track after validating and trimming its form values', async () => {
    const values = new FormData()
    values.set('albumId', ' album-one ')
    values.set('artist', ' Artist ')
    values.set('audio', AUDIO)
    values.set('title', ' Title ')

    await expect(createAdminTrackAction(values)).resolves.toEqual({status: 'created'})
    expect(uploadMocks.validateTrackAudio).toHaveBeenCalledWith(AUDIO)
    expect(creationMocks.createTrackWithAudio).toHaveBeenCalledWith({
      albumId: 'album-one',
      artist: 'Artist',
      audio: AUDIO,
      title: 'Title',
    })
  })

  it('should reject a missing or invalid audio file before starting its workflow', async () => {
    const missingAudio = new URLSearchParams({albumId: 'album-one'})
    const invalidAudio = new FormData()
    invalidAudio.set('audio', AUDIO)
    uploadMocks.validateTrackAudio.mockImplementationOnce(() => {
      throw new TypeError('invalid MP3')
    })

    await expect(createAdminTrackAction(missingAudio)).resolves.toEqual({
      detail: 'MP3 파일을 선택해 주세요.',
      status: 'rejected',
    })
    await expect(createAdminTrackAction(invalidAudio)).resolves.toEqual({
      detail: 'invalid MP3',
      status: 'rejected',
    })
    expect(creationMocks.createTrackWithAudio).not.toHaveBeenCalled()
  })

  it('should omit an empty cover file and normalize a non-error album rejection', async () => {
    const values = new FormData()
    values.set('coverFile', new File([], 'empty.webp', {type: 'image/webp'}))
    albumMocks.createAlbum.mockRejectedValueOnce('offline')

    await expect(createAdminAlbumAction(values)).resolves.toEqual({
      detail: '앨범을 저장하지 못했습니다.',
      status: 'rejected',
    })
    expect(albumMocks.createAlbum).toHaveBeenCalledWith(expect.any(Object), null)
  })

  it('should convert offer form values and normalize adapter rejection', async () => {
    const values = new URLSearchParams({albumId: ' album-one ', externalProductId: ' sku-one '})
    commandMocks.connectAlbumOffer.mockRejectedValueOnce(new Error('offer rejected'))

    await expect(connectAdminAlbumOfferAction(values)).resolves.toEqual({
      detail: 'offer rejected',
      status: 'failed',
    })
    expect(commandMocks.connectAlbumOffer).toHaveBeenCalledWith('album-one', 'sku-one')
  })

  it('should return success after connecting an offer', async () => {
    const values = new URLSearchParams({albumId: 'album-one', externalProductId: 'sku-one'})

    await expect(connectAdminAlbumOfferAction(values)).resolves.toEqual({status: 'succeeded'})
    expect(commandMocks.connectAlbumOffer).toHaveBeenCalledWith('album-one', 'sku-one')
  })
})

describe('row and access actions', () => {
  it('should preserve status, removal, confirmation, and playback adapter arguments', async () => {
    await expect(changeAdminAlbumStatusAction('album-one', 'publish')).resolves.toEqual({
      status: 'succeeded',
    })
    await expect(removeAdminTrackAction('track-one')).resolves.toEqual({status: 'succeeded'})
    await expect(confirmAdminTrackAction('asset-one')).resolves.toEqual({status: 'active'})
    await expect(requestAdminTrackPlaybackAction('track-one')).resolves.toEqual({
      status: 'granted',
      url: 'https://audio.example/track.mp3',
    })

    expect(commandMocks.changeAlbumStatus).toHaveBeenCalledWith('album-one', 'publish')
    expect(creationMocks.removeTrack).toHaveBeenCalledWith('track-one')
    expect(uploadMocks.confirmTrackAudioRegistration).toHaveBeenCalledWith('asset-one')
    expect(playbackMocks.requestAdminTrackPlaybackAccess).toHaveBeenCalledWith('track-one')
  })

  it('should distinguish ambiguous confirmation from adapter rejection', async () => {
    uploadMocks.confirmTrackAudioRegistration
      .mockResolvedValueOnce({status: 'unconfirmed'})
      .mockRejectedValueOnce(new Error('invalid asset'))

    await expect(confirmAdminTrackAction('asset-one')).resolves.toEqual({
      status: 'unconfirmed',
    })
    await expect(confirmAdminTrackAction('asset-two')).resolves.toEqual({
      detail: 'invalid asset',
      status: 'rejected',
    })
  })

  it('should normalize status, removal, confirmation, and playback failures', async () => {
    commandMocks.changeAlbumStatus.mockRejectedValueOnce(new Error('status failed'))
    creationMocks.removeTrack.mockRejectedValueOnce('offline')
    uploadMocks.confirmTrackAudioRegistration.mockRejectedValueOnce('offline')
    playbackMocks.requestAdminTrackPlaybackAccess.mockRejectedValueOnce(new Error('unavailable'))

    await expect(changeAdminAlbumStatusAction('album-one', 'archive')).resolves.toEqual({
      detail: 'status failed',
      status: 'failed',
    })
    await expect(removeAdminTrackAction('track-one')).resolves.toEqual({
      detail: '수록곡을 삭제하지 못했습니다.',
      status: 'failed',
    })
    await expect(confirmAdminTrackAction('asset-one')).resolves.toEqual({
      detail: 'MP3 등록을 확인하지 못했습니다.',
      status: 'rejected',
    })
    await expect(requestAdminTrackPlaybackAction('track-one')).resolves.toEqual({
      status: 'unavailable',
    })
  })
})
