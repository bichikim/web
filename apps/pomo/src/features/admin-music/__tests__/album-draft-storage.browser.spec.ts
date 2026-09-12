/** @vitest-environment jsdom */

import {beforeEach, expect, it, vi} from 'vitest'

const dexie = vi.hoisted(() => {
  const records = new Map<string, {blob: Blob; id: string; updatedAt: number}>()
  const references = new Map<
    string,
    {readonly coverDraftId: string | null; readonly id: string; readonly lastSeenAt: number}
  >()
  const primaryKeys = vi.fn(async () => [...records.keys()])
  const below = vi.fn(() => ({primaryKeys}))
  const referenceToArray = vi.fn(async () => [...references.values()])
  const referenceBelowDelete = vi.fn(async () => {
    references.clear()
  })
  const referenceBelow = vi.fn(() => ({delete: referenceBelowDelete}))
  const referenceAboveOrEqual = vi.fn(() => ({toArray: referenceToArray}))
  const referenceWhere = vi.fn(() => ({
    aboveOrEqual: referenceAboveOrEqual,
    below: referenceBelow,
  }))
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
    update: vi.fn(async (id: string, changes: {readonly updatedAt: number}) => {
      const record = records.get(id)
      if (record !== undefined) {
        records.set(id, {...record, ...changes})
      }
      return record === undefined ? 0 : 1
    }),
    where: vi.fn(() => ({below})),
  }
  const referenceTable = {
    delete: vi.fn(async (id: string) => {
      references.delete(id)
    }),
    put: vi.fn(async (reference: {coverDraftId: string | null; id: string; lastSeenAt: number}) => {
      references.set(reference.id, reference)
    }),
    where: referenceWhere,
  }
  const stores = vi.fn()
  const upgrade = vi.fn((callback: (transaction: unknown) => unknown) =>
    callback({table: () => ({toCollection: () => ({modify})})}),
  )

  const transaction = vi.fn(async (...argumentsList: unknown[]) => {
    const callback = argumentsList.at(-1)

    if (typeof callback !== 'function') {
      throw new TypeError('Transaction callback is missing')
    }

    return callback()
  })

  return {
    below,
    modify,
    primaryKeys,
    records,
    references,
    referenceTable,
    stores,
    table,
    transaction,
    upgrade,
  }
})

vi.mock('dexie', () => ({
  default: class DexieMock {
    readonly covers = dexie.table
    readonly draftReferences = dexie.referenceTable

    transaction(...argumentsList: unknown[]) {
      return dexie.transaction(...argumentsList)
    }

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
  writeAlbumDraftReference,
  writeAlbumDraftCover,
  writeAlbumDraftData,
} from '../album-draft-storage'

const DRAFT = {
  albumId: '00000000-0000-4000-8000-000000000002',
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
  dexie.references.clear()
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

  expect(dexie.stores).toHaveBeenCalledTimes(3)
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

it('should preserve an expired browser cover referenced by another active tab', async () => {
  const cover = new File(['webp'], 'cover.webp', {type: 'image/webp'})
  await writeAlbumDraftCover('other-tab-cover', cover)
  await writeAlbumDraftReference({
    coverDraftId: 'other-tab-cover',
    now: () => Date.now(),
    referenceId: 'other-tab',
  })

  await expect(deleteExpiredAlbumDraftCovers({activeCoverDraftId: null})).resolves.toEqual({
    success: true,
  })
  expect(dexie.table.bulkDelete).toHaveBeenLastCalledWith([])
  await expect(readAlbumDraftCover('other-tab-cover')).resolves.not.toBeNull()
})
