/** @vitest-environment jsdom */

import 'fake-indexeddb/auto'

import {afterEach, expect, it, vi} from 'vitest'

import {
  deleteAlbumDraftReference,
  deleteExpiredAlbumDraftCovers,
  readAlbumDraftCover,
  writeAlbumDraftCover,
  writeAlbumDraftReference,
} from '../album-draft-storage'

afterEach(() => vi.restoreAllMocks())

it('should preserve a recently active cover after its page releases the reference', async () => {
  const clock = vi.spyOn(Date, 'now').mockReturnValue(Date.UTC(2026, 7, 1))
  await writeAlbumDraftCover('navigation-cover', new File(['cover'], 'cover.webp'))
  clock.mockReturnValue(Date.UTC(2026, 8, 11))
  await writeAlbumDraftReference({coverDraftId: 'navigation-cover', referenceId: 'navigation'})
  await deleteAlbumDraftReference('navigation')

  await deleteExpiredAlbumDraftCovers({activeCoverDraftId: null})

  await expect(readAlbumDraftCover('navigation-cover')).resolves.not.toBeNull()
  clock.mockReturnValue(Date.UTC(2026, 9, 12))
  await deleteExpiredAlbumDraftCovers({activeCoverDraftId: null})
  await expect(readAlbumDraftCover('navigation-cover')).resolves.toBeNull()
})

it('should reclaim a cover after an abandoned reference expires', async () => {
  const clock = vi.spyOn(Date, 'now').mockReturnValue(Date.UTC(2026, 7, 1))
  await writeAlbumDraftCover('abandoned-cover', new File(['cover'], 'cover.webp'))
  await writeAlbumDraftReference({coverDraftId: 'abandoned-cover', referenceId: 'abandoned'})
  clock.mockReturnValue(Date.UTC(2026, 8, 11))

  await deleteExpiredAlbumDraftCovers({activeCoverDraftId: null})

  await expect(readAlbumDraftCover('abandoned-cover')).resolves.toBeNull()
})
