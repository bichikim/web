import {beforeEach, describe, expect, it, vi} from 'vitest'

import {
  type AlbumCreationStore,
  type CreateAlbumInput,
  createAlbumWithStore,
  type ExistingAlbumRecord,
} from '../album-creation'

const ALBUM_ID = '00000000-0000-4000-8000-000000000002'
const RESERVATION_ID = '019d1990-1dc9-7255-a7b5-f9459dfaf783'
const NOW = new Date('2026-09-02T12:00:00.000Z')
const input = {
  coverDraftId: null,
  coverFallback: 'music',
  coverImageUrl: null,
  coverReservationId: null,
  id: ALBUM_ID,
  translations: [{description: 'Description', locale: 'ko', title: 'Title'}],
} satisfies CreateAlbumInput
const createdAlbum = {
  coverFallback: 'music',
  coverImageUrl: null,
  id: ALBUM_ID,
  status: 'draft',
} as const
const createdTranslations = [
  {albumId: ALBUM_ID, description: 'Description', locale: 'ko', title: 'Title'},
] as const
const existingAlbum = {
  ...createdAlbum,
  coverDraftId: null,
  translations: createdTranslations,
} satisfies ExistingAlbumRecord

const createStore = () =>
  ({
    deleteCoverReservation: vi.fn().mockResolvedValue(undefined),
    insertAlbum: vi.fn().mockResolvedValue(createdAlbum),
    insertTranslations: vi.fn().mockResolvedValue(createdTranslations),
    lockCoverReservation: vi.fn().mockResolvedValue(null),
    markCoverForDeletion: vi.fn().mockResolvedValue(undefined),
    readAlbum: vi.fn().mockResolvedValue(null),
  }) satisfies AlbumCreationStore

const createCoveredInput = (overrides: Partial<CreateAlbumInput> = {}): CreateAlbumInput => ({
  ...input,
  coverDraftId: 'draft-id',
  coverImageUrl: 'https://cdn.example/cover.webp',
  coverReservationId: RESERVATION_ID,
  ...overrides,
})

beforeEach(() => {
  vi.clearAllMocks()
})

describe('createAlbumWithStore', () => {
  it('should create an album and its translations through the store', async () => {
    const store = createStore()

    await expect(createAlbumWithStore(input, store, NOW)).resolves.toEqual({
      album: {...createdAlbum, translations: createdTranslations},
      success: true,
    })
    expect(store.insertAlbum).toHaveBeenCalledWith(input)
    expect(store.insertTranslations).toHaveBeenCalledWith(ALBUM_ID, input.translations)
  })

  it('should support an album with no translations', async () => {
    const store = createStore()
    store.insertTranslations.mockResolvedValueOnce([])
    const inputWithoutTranslations = {...input, translations: []}

    await expect(createAlbumWithStore(inputWithoutTranslations, store, NOW)).resolves.toEqual({
      album: {...createdAlbum, translations: []},
      success: true,
    })
    expect(store.insertTranslations).toHaveBeenCalledWith(ALBUM_ID, [])
  })

  it('should reject when insertion loses a race without a created album', async () => {
    const store = createStore()
    store.insertAlbum.mockResolvedValueOnce(null)

    await expect(createAlbumWithStore(input, store, NOW)).rejects.toThrow(
      'Failed to create a music album',
    )
  })

  it('should return an existing album when the same creation ID is retried', async () => {
    const store = createStore()
    store.insertAlbum.mockResolvedValueOnce(null)
    store.readAlbum.mockResolvedValueOnce(existingAlbum)

    await expect(createAlbumWithStore(input, store, NOW)).resolves.toEqual({
      album: createdAlbumWithTranslations(existingAlbum),
      success: true,
    })
  })

  it('should match retried translations independently of locale order', async () => {
    const store = createStore()
    const englishTranslation = {
      albumId: ALBUM_ID,
      description: 'English description',
      locale: 'en',
      title: 'English title',
    } as const
    store.insertAlbum.mockResolvedValueOnce(null)
    store.readAlbum.mockResolvedValueOnce({
      ...existingAlbum,
      translations: [...createdTranslations, englishTranslation],
    })

    await expect(
      createAlbumWithStore(
        {
          ...input,
          translations: [
            {
              description: englishTranslation.description,
              locale: englishTranslation.locale,
              title: englishTranslation.title,
            },
            ...input.translations,
          ],
        },
        store,
        NOW,
      ),
    ).resolves.toMatchObject({success: true})
  })

  it('should reject a retried creation ID with different metadata', async () => {
    const store = createStore()
    store.insertAlbum.mockResolvedValueOnce(null)
    store.readAlbum.mockResolvedValueOnce(existingAlbum)

    await expect(
      createAlbumWithStore(
        {
          ...input,
          translations: [{description: 'Description', locale: 'ko', title: 'New Title'}],
        },
        store,
        NOW,
      ),
    ).resolves.toEqual({code: 'album_creation_payload_mismatch', success: false})
  })

  it('should propagate an unexpected store failure', async () => {
    const store = createStore()
    store.insertAlbum.mockRejectedValueOnce(new Error('create failed'))

    await expect(createAlbumWithStore(input, store, NOW)).rejects.toThrow('create failed')
  })

  it('should return an existing covered album and release the unused upload', async () => {
    const store = createStore()
    const coveredExistingAlbum = {
      ...existingAlbum,
      coverDraftId: 'draft-id',
      coverImageUrl: 'https://cdn.example/original-cover.webp',
    }
    store.readAlbum.mockResolvedValueOnce(coveredExistingAlbum)
    const coveredInput = createCoveredInput()

    await expect(createAlbumWithStore(coveredInput, store, NOW)).resolves.toEqual({
      album: createdAlbumWithTranslations(coveredExistingAlbum),
      success: true,
    })
    expect(store.markCoverForDeletion).toHaveBeenCalledWith({
      coverDraftId: 'draft-id',
      coverImageUrl: 'https://cdn.example/cover.webp',
      coverReservationId: RESERVATION_ID,
      now: NOW,
    })
    expect(store.insertAlbum).not.toHaveBeenCalled()
    expect(store.deleteCoverReservation).not.toHaveBeenCalled()
  })

  it('should reject a retried creation ID with a different cover draft', async () => {
    const store = createStore()
    store.readAlbum.mockResolvedValueOnce({
      ...existingAlbum,
      coverDraftId: 'original-draft-id',
      coverImageUrl: 'https://cdn.example/original-cover.webp',
    })
    const coveredInput = createCoveredInput({
      coverDraftId: 'new-draft-id',
      coverImageUrl: 'https://cdn.example/new-cover.webp',
    })

    await expect(createAlbumWithStore(coveredInput, store, NOW)).resolves.toEqual({
      code: 'album_creation_payload_mismatch',
      success: false,
    })
    expect(store.markCoverForDeletion).toHaveBeenCalledWith({
      coverDraftId: 'new-draft-id',
      coverImageUrl: 'https://cdn.example/new-cover.webp',
      coverReservationId: RESERVATION_ID,
      now: NOW,
    })
  })

  it('should return a covered album completed while its reservation was locking', async () => {
    const store = createStore()
    const coveredExistingAlbum = {...existingAlbum, coverDraftId: 'draft-id'}
    store.readAlbum.mockResolvedValueOnce(null).mockResolvedValueOnce(coveredExistingAlbum)
    const coveredInput = createCoveredInput()

    await expect(createAlbumWithStore(coveredInput, store, NOW)).resolves.toEqual({
      album: createdAlbumWithTranslations(coveredExistingAlbum),
      success: true,
    })
    expect(store.lockCoverReservation).toHaveBeenCalledWith({id: RESERVATION_ID, now: NOW})
    expect(store.insertAlbum).not.toHaveBeenCalled()
  })

  it('should claim a matching pending cover reservation', async () => {
    const store = createStore()
    store.lockCoverReservation.mockResolvedValueOnce({
      coverImageUrl: 'https://cdn.example/cover.webp',
      draftId: 'draft-id',
    })
    const coveredInput = createCoveredInput()

    await expect(createAlbumWithStore(coveredInput, store, NOW)).resolves.toEqual({
      album: {...createdAlbum, translations: createdTranslations},
      success: true,
    })
    expect(store.lockCoverReservation).toHaveBeenCalledWith({id: RESERVATION_ID, now: NOW})
    expect(store.deleteCoverReservation).toHaveBeenCalledWith(RESERVATION_ID)
  })

  it.each([
    {reservation: null},
    {reservation: {coverImageUrl: 'https://cdn.example/other.webp', draftId: 'draft-id'}},
    {reservation: {coverImageUrl: 'https://cdn.example/cover.webp', draftId: 'other-draft'}},
  ])('should reject missing or mismatched cover reservation %#', async ({reservation}) => {
    const store = createStore()
    store.lockCoverReservation.mockResolvedValueOnce(reservation)

    await expect(createAlbumWithStore(createCoveredInput(), store, NOW)).resolves.toEqual({
      code: 'cover_reservation_invalid',
      success: false,
    })
    expect(store.insertAlbum).not.toHaveBeenCalled()
  })

  it('should reject incomplete cover ownership before reading the store', async () => {
    const store = createStore()

    await expect(
      createAlbumWithStore({...input, coverDraftId: 'draft-id'}, store, NOW),
    ).resolves.toEqual({code: 'cover_reservation_invalid', success: false})
    await expect(
      createAlbumWithStore({...input, coverReservationId: RESERVATION_ID}, store, NOW),
    ).resolves.toEqual({code: 'cover_reservation_invalid', success: false})
    expect(store.readAlbum).not.toHaveBeenCalled()
    expect(store.lockCoverReservation).not.toHaveBeenCalled()
  })
})

const createdAlbumWithTranslations = (album: ExistingAlbumRecord) => ({
  coverFallback: album.coverFallback,
  coverImageUrl: album.coverImageUrl,
  id: album.id,
  status: album.status,
  translations: album.translations,
})
