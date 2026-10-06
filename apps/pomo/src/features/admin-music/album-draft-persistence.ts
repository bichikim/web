import type {Setter} from 'solid-js'

import type {AlbumDraftData} from './album-draft'
import type {DraftReferenceUpdater} from './create-draft-reference-lifecycle'

export const getAlbumDraftStorage = () => import('./album-draft-storage')

export const COVER_STORAGE_WARNING =
  '커버는 준비했지만 브라우저에 저장하지 못했습니다. 이 탭을 닫기 전에 앨범을 만들어 주세요.'

export const persistDraftData = async (
  draft: AlbumDraftData,
  setMessage: Setter<string | null>,
  updateDraftReference: DraftReferenceUpdater,
  preserveLatestCoverMetadata: boolean,
): Promise<AlbumDraftData | null> => {
  let persistedDraft: AlbumDraftData | null = null

  try {
    const {readAlbumDraftData, writeAlbumDraftData} = await getAlbumDraftStorage()
    const storedDraftResult = preserveLatestCoverMetadata ? readAlbumDraftData() : null
    if (storedDraftResult !== null && !storedDraftResult.success) {
      setMessage('브라우저 초안의 최신 상태를 읽지 못했습니다. 다시 시도해 주세요.')
      return null
    }
    const storedDraft = storedDraftResult?.data ?? null
    const draftToPersist = {
      ...draft,
      ...(storedDraftResult === null
        ? {}
        : {
            coverDraftId: storedDraft?.coverDraftId ?? null,
            hasCoverFile: storedDraft?.hasCoverFile ?? false,
          }),
    }

    if (!writeAlbumDraftData(draftToPersist).success) {
      setMessage('브라우저에 초안을 저장하지 못했습니다. 이 탭을 닫기 전에 다시 시도해 주세요.')
      return null
    }
    persistedDraft = draftToPersist

    if (!(await updateDraftReference(draftToPersist.coverDraftId)).success) {
      setMessage(
        '브라우저 초안은 저장했지만 다른 탭과 커버 참조를 동기화하지 못했습니다. 이 탭을 닫기 전에 다시 시도해 주세요.',
      )
    }
    return persistedDraft
  } catch (error) {
    console.warn('Failed to load the album draft storage.', error)
    setMessage('브라우저 초안 저장 기능을 불러오지 못했습니다. 이 탭을 닫지 마세요.')
    return persistedDraft
  }
}

export const removePreparedCoverDraft = async (
  previousCoverDraftId: string | null,
  draft: AlbumDraftData,
  updateDraftReference: DraftReferenceUpdater,
): Promise<string | null> => {
  const {deleteAlbumDraftCover, writeAlbumDraftData} = await getAlbumDraftStorage()
  const dataWriteResult = writeAlbumDraftData(draft)

  if (!dataWriteResult.success) {
    return '커버는 화면에서 지웠지만 브라우저 초안을 갱신하지 못했습니다. 이 탭을 닫기 전에 다시 시도해 주세요.'
  }

  if (!(await updateDraftReference(null)).success) {
    return '커버는 화면에서 지웠지만 다른 탭과 커버 참조를 동기화하지 못했습니다. 이 탭을 닫기 전에 다시 시도해 주세요.'
  }

  if (previousCoverDraftId !== null) {
    await deleteAlbumDraftCover(previousCoverDraftId)
  }

  return null
}

export interface PreparedCoverPersistenceResult {
  readonly message: string
  readonly success: boolean
}

export const persistPreparedCover = async ({
  draft,
  file,
  nextCoverDraftId,
  previousCoverDraftId,
  updateDraftReference,
}: {
  readonly draft: AlbumDraftData
  readonly file: File
  readonly nextCoverDraftId: string
  readonly previousCoverDraftId: string | null
  readonly updateDraftReference: DraftReferenceUpdater
}): Promise<PreparedCoverPersistenceResult> => {
  const {deleteAlbumDraftCover, writeAlbumDraftCover, writeAlbumDraftData} =
    await getAlbumDraftStorage()
  const coverWriteResult = await writeAlbumDraftCover(nextCoverDraftId, file)

  if (!coverWriteResult.success) {
    return {
      message: COVER_STORAGE_WARNING,
      success: false,
    }
  }

  const dataWriteResult = writeAlbumDraftData(draft)

  if (!dataWriteResult.success) {
    await deleteAlbumDraftCover(nextCoverDraftId)
    return {
      message:
        '커버는 준비했지만 브라우저에 초안을 저장하지 못했습니다. 이 탭을 닫기 전에 앨범을 만들어 주세요.',
      success: false,
    }
  }

  if (!(await updateDraftReference(nextCoverDraftId)).success) {
    return {
      message:
        '커버는 준비했지만 다른 탭과 커버 참조를 동기화하지 못했습니다. 이 탭을 닫기 전에 다시 시도해 주세요.',
      success: false,
    }
  }

  if (previousCoverDraftId !== null) {
    await deleteAlbumDraftCover(previousCoverDraftId)
  }

  return {message: '커버를 중앙 정사각형으로 자르고 1200×1200 WebP로 준비했습니다.', success: true}
}
