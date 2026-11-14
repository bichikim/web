import {afterEach, expect, it, vi} from 'vitest'

import {
  readCustomAlbumDraft,
  readCustomAlbums,
  saveCustomAlbum,
  type SaveCustomAlbumOptions,
} from 'src/features/custom-albums'
import {ALBUM_STORE_NAME, openCustomAlbumDatabase} from '../database'
import {clearCustomAlbumDatabase} from './support/clear-database'

const input: SaveCustomAlbumOptions = {
  albumId: null,
  artist: 'Artist',
  coverIcon: 'disc',
  coverImage: {kind: 'keep'},
  coverSource: 'automatic',
  title: 'Original album',
  tracks: ['kept', 'removed'].map((id) => ({
    audio: new Blob([id], {type: 'audio/mpeg'}),
    durationSeconds: 60,
    fileName: `${id}.mp3`,
    id: `custom-track:${id}`,
    title: id,
  })),
}

afterEach(async () => {
  vi.restoreAllMocks()
  await clearCustomAlbumDatabase()
})

it('should resolve only after the album and track transaction commits', async () => {
  const database = await openCustomAlbumDatabase()
  const transaction = database.transaction.bind(database)
  const events: string[] = []
  vi.spyOn(database, 'transaction').mockImplementation((...args) => {
    const pending = transaction(...args)
    pending.addEventListener('complete', () => events.push('committed'), {once: true})
    return pending
  })

  await saveCustomAlbum(input).then(() => events.push('resolved'))

  expect(events).toEqual(['committed', 'resolved'])
})

it('should reject an aborted first read and preserve both stored records', async () => {
  const albumId = await saveCustomAlbum(input)
  const before = await readCustomAlbumDraft({albumId})
  const {getAll} = IDBObjectStore.prototype
  const abortReads = vi
    .spyOn(IDBObjectStore.prototype, 'getAll')
    .mockImplementation(function abortReads(this: IDBObjectStore, ...args) {
      const request = getAll.apply(this, args)
      if (this.name === ALBUM_STORE_NAME) {
        request.addEventListener('success', () => this.transaction.abort(), {once: true})
      }
      return request
    })

  await expect(saveCustomAlbum({...input, albumId, title: 'Replacement'})).rejects.toThrow()
  abortReads.mockRestore()

  expect(await readCustomAlbumDraft({albumId})).toEqual(before)
})

it.each(['write-failure', 'quota-exceeded'] as const)(
  'should roll back queued track changes and preserve the %s error',
  async (kind) => {
    const albumId = await saveCustomAlbum(input)
    const before = await readCustomAlbumDraft({albumId})
    const error =
      kind === 'quota-exceeded'
        ? new DOMException('Storage is full', 'QuotaExceededError')
        : new Error('Album write failed')
    const {put} = IDBObjectStore.prototype
    const failAlbumWrite = vi
      .spyOn(IDBObjectStore.prototype, 'put')
      .mockImplementation(function failAlbumWrite(this: IDBObjectStore, ...args) {
        if (this.name === ALBUM_STORE_NAME) {
          throw error
        }
        return put.apply(this, args)
      })
    const saved = saveCustomAlbum({
      ...input,
      albumId,
      title: 'Replacement',
      tracks: [{...input.tracks[0]!, audio: new Blob(['new-audio'], {type: 'audio/mpeg'})}],
    })

    if (kind === 'quota-exceeded') {
      await expect(saved).rejects.toMatchObject({cause: error, code: 'quota-exceeded'})
    } else {
      await expect(saved).rejects.toBe(error)
    }
    failAlbumWrite.mockRestore()

    const stored = await readCustomAlbumDraft({albumId})
    expect(stored).toEqual(before)
    expect(await stored!.tracks[0]!.audio.text()).toBe('kept')
    expect(await stored!.tracks[1]!.audio.text()).toBe('removed')
  },
)

it('should serialize overlapping saves before validating track ownership', async () => {
  const first = saveCustomAlbum(input)
  const second = saveCustomAlbum({...input, title: 'Competing album'})

  const [albumId] = await Promise.all([
    first,
    expect(second).rejects.toMatchObject({code: 'invalid-album'}),
  ])

  const albums = await readCustomAlbums()
  expect(albums.map(({id, title}) => ({id, title}))).toEqual([
    {id: albumId, title: 'Original album'},
  ])
  expect(await readCustomAlbumDraft({albumId})).toMatchObject({tracks: input.tracks})
})
