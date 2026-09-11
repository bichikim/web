/** @vitest-environment jsdom */

import 'fake-indexeddb/auto'

import {afterEach, expect, it, vi} from 'vitest'

import {
  deleteAlbumDraft,
  deleteAlbumDraftCover,
  deleteAlbumDraftReference,
  deleteExpiredAlbumDraftCovers,
  readAlbumDraftCover,
  writeAlbumDraftCover,
  writeAlbumDraftReference,
} from '../album-draft-storage'

afterEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
})

it('should retain legacy tab references until their retention period ends', async () => {
  const clock = vi.spyOn(Date, 'now').mockReturnValue(Date.UTC(2026, 7, 1))
  await writeAlbumDraftCover('legacy-cover', new File(['cover'], 'cover.webp'))
  clock.mockReturnValue(Date.UTC(2026, 8, 11))
  localStorage.setItem(
    'pomo:admin-music:album-draft-session:v1:legacy-tab',
    JSON.stringify({coverDraftId: 'legacy-cover', lastSeenAt: Date.now()}),
  )
  localStorage.setItem('pomo:admin-music:album-draft-session:v1:malformed', '{invalid')

  await deleteExpiredAlbumDraftCovers({activeCoverDraftId: null})
  await expect(readAlbumDraftCover('legacy-cover')).resolves.not.toBeNull()

  clock.mockReturnValue(Date.UTC(2026, 9, 12))
  await deleteExpiredAlbumDraftCovers({activeCoverDraftId: null})
  await expect(readAlbumDraftCover('legacy-cover')).resolves.toBeNull()
})

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

it.each([deleteAlbumDraftCover, deleteAlbumDraft])(
  'should preserve a shared cover during explicit deletion until all active references release',
  async (remove) => {
    const id = crypto.randomUUID()
    await writeAlbumDraftCover(id, new File(['shared'], 'cover.webp'))
    await writeAlbumDraftReference({coverDraftId: id, referenceId: 'first'})
    await writeAlbumDraftReference({coverDraftId: id, referenceId: 'second'})
    await deleteAlbumDraftReference('first')

    await expect(remove(id)).resolves.toEqual({success: true})
    await expect(readAlbumDraftCover(id)).resolves.not.toBeNull()

    await deleteAlbumDraftReference('second')
    await expect(remove(id)).resolves.toEqual({success: true})
    await expect(readAlbumDraftCover(id)).resolves.toBeNull()
  },
)

it('should preserve a legacy reference at the retention boundary during explicit deletion', async () => {
  const id = 'explicit-legacy'
  await writeAlbumDraftCover(id, new File(['cover'], 'cover.webp'))
  localStorage.setItem(
    'pomo:admin-music:album-draft-session:v1:legacy',
    JSON.stringify({coverDraftId: id, lastSeenAt: Date.UTC(2026, 7, 12)}),
  )
  await deleteAlbumDraftCover(id, {now: () => Date.UTC(2026, 8, 11)})
  await expect(readAlbumDraftCover(id)).resolves.not.toBeNull()
  await deleteAlbumDraftCover(id, {now: () => Date.UTC(2026, 8, 11) + 1})
  await expect(readAlbumDraftCover(id)).resolves.toBeNull()
})

it('should ignore expired IndexedDB references during explicit deletion', async () => {
  const id = 'explicit-expired'
  await writeAlbumDraftCover(id, new File(['cover'], 'cover.webp'))
  await writeAlbumDraftReference({coverDraftId: id, now: () => 0, referenceId: id})
  await deleteAlbumDraftCover(id)
  await expect(readAlbumDraftCover(id)).resolves.toBeNull()
})

it.each([deleteAlbumDraftCover, deleteAlbumDraft])(
  'should apply the supplied clock to the IndexedDB reference retention boundary',
  async (remove) => {
    const id = crypto.randomUUID()
    await writeAlbumDraftCover(id, new File(['cover'], 'cover.webp'))
    await writeAlbumDraftReference({
      coverDraftId: id,
      now: () => Date.UTC(2026, 7, 12),
      referenceId: id,
    })

    await expect(remove(id, {now: () => Date.UTC(2026, 8, 11)})).resolves.toEqual({success: true})
    await expect(readAlbumDraftCover(id)).resolves.not.toBeNull()
    await expect(remove(id, {now: () => Date.UTC(2026, 8, 11) + 1})).resolves.toEqual({
      success: true,
    })
    await expect(readAlbumDraftCover(id)).resolves.toBeNull()
  },
)
