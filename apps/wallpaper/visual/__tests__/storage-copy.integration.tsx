import Dexie from 'dexie'
import {afterEach, expect, test} from 'vitest'
import {exportArchive, hashArchive, importArchive} from '../../src/features/storage-copy/archive'
const names: string[] = []
afterEach(async () => {
  await Promise.all(names.splice(0).map((name) => Dexie.delete(name)))
})
const fixture = async () => {
  const name = `wallpaper-storage-test-${crypto.randomUUID()}`
  names.push(name)
  const database = new Dexie(name)
  database.version(2).stores({items: 'id,kind', preferences: ''})
  await database.open()
  await database.table('items').add({
    blob: new Blob([new Uint8Array([1, 2, 3, 4])], {type: 'image/png'}),
    date: new Date('2026-01-02'),
    id: 'custom',
    kind: 'model',
    name: '사용자 지정 이름',
    values: new Float32Array([1.25, -0, 3]),
  })
  await database.table('preferences').put({enabled: true}, 'current')
  const blob = await exportArchive(name)
  return {blob, database, metadata: {length: blob.size, name, sha256: await hashArchive(blob)}}
}
test('should preserve schema custom names and binary values across a verified import', async () => {
  const s = await fixture()
  s.database.close()
  await Dexie.delete(s.metadata.name)
  await importArchive(s.blob, s.metadata)
  const restored = await new Dexie(s.metadata.name).open()
  try {
    const record = await restored.table('items').get('custom')
    expect(record.name).toBe('사용자 지정 이름')
    expect(Array.from(new Uint8Array(await record.blob.arrayBuffer()))).toEqual([1, 2, 3, 4])
    expect(record.blob.type).toBe('image/png')
    expect(Object.is(record.values[1], -0)).toBe(true)
    expect(record.date.toISOString()).toBe('2026-01-02T00:00:00.000Z')
    expect(await restored.table('preferences').get('current')).toEqual({enabled: true})
    await importArchive(s.blob, s.metadata)
    expect(await restored.table('items').count()).toBe(1)
  } finally {
    restored.close()
  }
})
test('should preserve conflicting target settings and reject damaged archives', async () => {
  const s = await fixture()
  try {
    await s.database.table('items').update('custom', {name: 'Changed by user'})
    await expect(importArchive(s.blob, s.metadata)).rejects.toThrow('differ')
    expect((await s.database.table('items').get('custom')).name).toBe('Changed by user')
    await expect(importArchive(new Blob(['broken']), s.metadata)).rejects.toThrow()
  } finally {
    s.database.close()
  }
})

test('should preserve authored strings longer than the streaming JSON token limit', async () => {
  const s = await fixture()
  const text = 'x'.repeat(11 * 1024 * 1024)
  try {
    await s.database.table('items').update('custom', {source: text})
    const blob = await exportArchive(s.metadata.name)
    const metadata = {...s.metadata, length: blob.size, sha256: await hashArchive(blob)}
    s.database.close()
    await Dexie.delete(metadata.name)
    await importArchive(blob, metadata)
    const restored = await new Dexie(metadata.name).open()
    try {
      expect((await restored.table('items').get('custom')).source).toBe(text)
    } finally {
      restored.close()
    }
  } finally {
    s.database.close()
  }
})
