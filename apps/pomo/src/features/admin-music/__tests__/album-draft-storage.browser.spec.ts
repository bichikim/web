/** @vitest-environment jsdom */

import {beforeEach, expect, it, vi} from 'vitest'

const dexie = vi.hoisted(() => {
  const records = new Map<string, {blob: Blob; id: string; updatedAt: number}>()
  const primaryKeys = vi.fn(async () => [...records.keys()])
  const below = vi.fn(() => ({primaryKeys}))
  const modify = vi.fn()
  const table = {
    bulkDelete: vi.fn(async (ids: string[]) => {
      for (const id of ids) {
        records.delete(id)
      }
    }),
    delete: vi.fn(async (id: string) => {
      records.delete(id)
    }),
    get: vi.fn(async (id: string) => records.get(id)),
    put: vi.fn(async (record: {blob: Blob; id: string; updatedAt: number}) => {
      records.set(record.id, record)
    }),
    where: vi.fn(() => ({below})),
  }
  const stores = vi.fn()
  const upgrade = vi.fn((callback: (transaction: unknown) => unknown) =>
    callback({table: () => ({toCollection: () => ({modify})})}),
  )

  return {below, modify, primaryKeys, records, stores, table, upgrade}
})

vi.mock('dexie', () => ({
  default: class DexieMock {
    readonly covers = dexie.table

    version() {
      return {
        stores: (schema: unknown) => {
          dexie.stores(schema)
          return {upgrade: dexie.upgrade}
        },
      }
    }
  },
}))

import {
  deleteAlbumDraft,
  deleteExpiredAlbumDraftCovers,
  readAlbumDraftCover,
  readAlbumDraftData,
  writeAlbumDraftCover,
  writeAlbumDraftData,
} from '../album-draft-storage'

const DRAFT = {
  coverDraftId: null,
  coverFallback: 'lp' as const,
  coverImageUrl: '',
  hasCoverFile: false,
  translations: {
    en: {description: '', title: ''},
    ja: {description: '', title: ''},
    ko: {description: '', title: ''},
    'zh-Hans': {description: '', title: ''},
  },
}

beforeEach(() => {
  dexie.records.clear()
  sessionStorage.clear()
  vi.clearAllMocks()
})

it('should use session storage and initialize the browser cover database once', async () => {
  expect(readAlbumDraftData()).toBeNull()
  expect(writeAlbumDraftData(DRAFT)).toEqual({success: true})
  expect(readAlbumDraftData()).toEqual(DRAFT)

  const cover = new File(['webp'], 'cover.webp', {type: 'image/webp'})
  await expect(writeAlbumDraftCover('cover', cover)).resolves.toEqual({success: true})
  await expect(readAlbumDraftCover('cover')).resolves.toMatchObject({type: 'image/webp'})
  await expect(readAlbumDraftCover('missing')).resolves.toBeNull()
  await expect(deleteAlbumDraft('cover')).resolves.toEqual({success: true})
  expect(readAlbumDraftData()).toBeNull()

  expect(dexie.stores).toHaveBeenCalledTimes(2)
  expect(dexie.modify).toHaveBeenCalledWith({updatedAt: expect.any(Number)})
})

it('should delete expired browser covers while preserving an active cover', async () => {
  const cover = new File(['webp'], 'cover.webp', {type: 'image/webp'})
  await writeAlbumDraftCover('old', cover)
  await writeAlbumDraftCover('protected', cover)

  await expect(deleteExpiredAlbumDraftCovers({activeCoverDraftId: 'protected'})).resolves.toEqual({
    success: true,
  })
  expect(dexie.table.bulkDelete).toHaveBeenLastCalledWith(['old'])

  await writeAlbumDraftCover('old', cover)
  await expect(deleteExpiredAlbumDraftCovers({activeCoverDraftId: null})).resolves.toEqual({
    success: true,
  })
  expect(dexie.table.bulkDelete).toHaveBeenLastCalledWith(['protected', 'old'])
  expect(dexie.below).toHaveBeenCalledWith(expect.any(Number))
})
