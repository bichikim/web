import {expect, it, vi} from 'vitest'

import {createPictureDiaryRepository} from '../repository'
import {createPictureDiaryEntry} from '../schema'

const createEntry = (date: string, id: string) =>
  createPictureDiaryEntry({
    createdAt: `${date}T03:00:00.000Z`,
    date,
    id,
    now: new Date(`${date}T03:00:00.000Z`),
    strokes: [],
    text: date,
  })

it('should return locally stored entries in newest-date order', async () => {
  const olderEntry = createEntry('2026-09-03', 'older')
  const newerEntry = createEntry('2026-09-04', 'newer')
  const repository = createPictureDiaryRepository({
    delete: vi.fn(),
    readAll: vi.fn().mockResolvedValue([olderEntry, newerEntry]),
    write: vi.fn(),
  })

  await expect(repository.list()).resolves.toEqual([newerEntry, olderEntry])
})

it('should write and delete entries through the storage boundary', async () => {
  const entry = createEntry('2026-09-04', 'entry-1')
  const write = vi.fn().mockResolvedValue(undefined)
  const remove = vi.fn().mockResolvedValue(undefined)
  const repository = createPictureDiaryRepository({
    delete: remove,
    readAll: vi.fn().mockResolvedValue([]),
    write,
  })

  await repository.save(entry)
  await repository.delete(entry.id)

  expect(write).toHaveBeenCalledWith(entry)
  expect(remove).toHaveBeenCalledWith(entry.id)
})

it('should expose invalid local data as a load failure', async () => {
  const repository = createPictureDiaryRepository({
    delete: vi.fn(),
    readAll: vi.fn().mockResolvedValue([{id: 'broken'}]),
    write: vi.fn(),
  })

  await expect(repository.list()).rejects.toThrow('Failed to read picture diary entries.')
})

it('should reject an invalid entry before writing it', async () => {
  const write = vi.fn()
  const repository = createPictureDiaryRepository({
    delete: vi.fn(),
    readAll: vi.fn().mockResolvedValue([]),
    write,
  })
  const invalidEntry = {...createEntry('2026-09-04', 'entry-1'), strokes: [], text: ''}

  await expect(repository.save(invalidEntry)).rejects.toThrow('Invalid picture diary entry.')
  expect(write).not.toHaveBeenCalled()
})

it('should preserve local write and delete failures as causes', async () => {
  const writeError = new Error('write failed')
  const deleteError = new Error('delete failed')
  const repository = createPictureDiaryRepository({
    delete: vi.fn().mockRejectedValue(deleteError),
    readAll: vi.fn().mockResolvedValue([]),
    write: vi.fn().mockRejectedValue(writeError),
  })

  await expect(repository.save(createEntry('2026-09-04', 'entry-1'))).rejects.toMatchObject({
    cause: writeError,
    message: 'Failed to save a picture diary entry.',
  })
  await expect(repository.delete('entry-1')).rejects.toMatchObject({
    cause: deleteError,
    message: 'Failed to delete a picture diary entry.',
  })
})
