export type AlbumLocale = 'en' | 'ja' | 'ko' | 'zh-Hans'
export type AlbumCoverFallback = 'lp' | 'cd' | 'music'
export type AlbumStatus = 'archived' | 'draft' | 'published'

export interface AlbumTranslationInput {
  readonly description: string
  readonly locale: AlbumLocale
  readonly title: string
}

export interface CreatedAlbumTranslation extends AlbumTranslationInput {
  readonly albumId: string
}

export interface CreateAlbumInput {
  readonly coverFallback: AlbumCoverFallback
  readonly coverDraftId: string | null
  readonly coverImageUrl: string | null
  readonly coverReservationId: string | null
  readonly id: string
  readonly translations: ReadonlyArray<AlbumTranslationInput>
}

export interface CreatedAlbumRecord {
  readonly coverFallback: AlbumCoverFallback
  readonly coverImageUrl: string | null
  readonly id: string
  readonly status: AlbumStatus
}

export interface ExistingAlbumRecord extends CreatedAlbumRecord {
  readonly coverDraftId: string | null
  readonly translations: ReadonlyArray<CreatedAlbumTranslation>
}

interface CreatedAlbum extends CreatedAlbumRecord {
  readonly translations: ReadonlyArray<CreatedAlbumTranslation>
}

interface AlbumCreationFailure {
  readonly code: 'album_creation_payload_mismatch' | 'cover_reservation_invalid'
  readonly success: false
}

interface AlbumCreationSuccess {
  readonly album: CreatedAlbum
  readonly success: true
}

export type CreateAlbumResult = AlbumCreationFailure | AlbumCreationSuccess

export interface CoverReservationRecord {
  readonly coverImageUrl: string | null
  readonly draftId: string
}

export interface LockCoverReservationOptions {
  readonly id: string
  readonly now: Date
}

export interface MarkCoverDeletionOptions {
  readonly coverDraftId: string
  readonly coverImageUrl: string
  readonly coverReservationId: string
  readonly now: Date
}

export interface AlbumCreationStore {
  readonly deleteCoverReservation: (id: string) => Promise<void>
  readonly insertAlbum: (input: CreateAlbumInput) => Promise<CreatedAlbumRecord | null>
  readonly insertTranslations: (
    albumId: string,
    translations: ReadonlyArray<AlbumTranslationInput>,
  ) => Promise<ReadonlyArray<CreatedAlbumTranslation>>
  readonly lockCoverReservation: (
    options: LockCoverReservationOptions,
  ) => Promise<CoverReservationRecord | null>
  readonly markCoverForDeletion: (options: MarkCoverDeletionOptions) => Promise<void>
  readonly readAlbum: (id: string) => Promise<ExistingAlbumRecord | null>
}

const sortTranslationsByLocale = (
  translations: ReadonlyArray<AlbumTranslationInput>,
): AlbumTranslationInput[] =>
  [...translations].sort((left, right) => left.locale.localeCompare(right.locale))

const matchesCreationInput = (
  existing: ExistingAlbumRecord,
  candidate: CreateAlbumInput,
): boolean => {
  const coverMatches =
    existing.coverDraftId === candidate.coverDraftId &&
    (candidate.coverDraftId !== null || existing.coverImageUrl === candidate.coverImageUrl)

  if (
    !coverMatches ||
    existing.coverFallback !== candidate.coverFallback ||
    existing.translations.length !== candidate.translations.length
  ) {
    return false
  }

  const existingTranslations = sortTranslationsByLocale(existing.translations)
  const candidateTranslations = sortTranslationsByLocale(candidate.translations)

  return existingTranslations.every((existingTranslation, index) => {
    const candidateTranslation = candidateTranslations[index]

    return (
      existingTranslation.locale === candidateTranslation.locale &&
      existingTranslation.title === candidateTranslation.title &&
      existingTranslation.description === candidateTranslation.description
    )
  })
}

const markUnusedCoverForDeletion = async (
  input: CreateAlbumInput,
  store: AlbumCreationStore,
  now: Date,
): Promise<void> => {
  if (
    input.coverReservationId === null ||
    input.coverDraftId === null ||
    input.coverImageUrl === null
  ) {
    return
  }

  await store.markCoverForDeletion({
    coverDraftId: input.coverDraftId,
    coverImageUrl: input.coverImageUrl,
    coverReservationId: input.coverReservationId,
    now,
  })
}

const returnMatchingAlbum = async (
  input: CreateAlbumInput,
  existingAlbum: ExistingAlbumRecord,
  store: AlbumCreationStore,
  now: Date,
): Promise<CreateAlbumResult> => {
  await markUnusedCoverForDeletion(input, store, now)

  if (!matchesCreationInput(existingAlbum, input)) {
    return {code: 'album_creation_payload_mismatch', success: false}
  }

  return {
    album: {
      coverFallback: existingAlbum.coverFallback,
      coverImageUrl: existingAlbum.coverImageUrl,
      id: existingAlbum.id,
      status: existingAlbum.status,
      translations: existingAlbum.translations,
    },
    success: true,
  }
}

/** Creates an album atomically while preserving retry and cover-reservation semantics. */
export const createAlbumWithStore = async (
  input: CreateAlbumInput,
  store: AlbumCreationStore,
  now: Date,
): Promise<CreateAlbumResult> => {
  if ((input.coverReservationId === null) !== (input.coverDraftId === null)) {
    return {code: 'cover_reservation_invalid', success: false}
  }

  if (input.coverReservationId !== null) {
    const existingAlbum = await store.readAlbum(input.id)

    if (existingAlbum !== null) {
      return returnMatchingAlbum(input, existingAlbum, store, now)
    }

    const reservation = await store.lockCoverReservation({id: input.coverReservationId, now})

    if (
      reservation === null ||
      reservation.draftId !== input.coverDraftId ||
      reservation.coverImageUrl !== input.coverImageUrl
    ) {
      const concurrentlyCreatedAlbum = await store.readAlbum(input.id)

      return concurrentlyCreatedAlbum === null
        ? {code: 'cover_reservation_invalid', success: false}
        : returnMatchingAlbum(input, concurrentlyCreatedAlbum, store, now)
    }
  }

  const album = await store.insertAlbum(input)

  if (album === null) {
    const concurrentlyCreatedAlbum = await store.readAlbum(input.id)

    if (concurrentlyCreatedAlbum === null) {
      throw new Error('Failed to create a music album')
    }

    return returnMatchingAlbum(input, concurrentlyCreatedAlbum, store, now)
  }

  const translations = await store.insertTranslations(album.id, input.translations)

  if (input.coverReservationId !== null) {
    await store.deleteCoverReservation(input.coverReservationId)
  }

  return {album: {...album, translations}, success: true}
}
