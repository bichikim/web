/** @vitest-environment jsdom */
import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import {afterEach, expect, it, vi} from 'vitest'
import {createWebRepository} from '../web-repository'
import {DEFAULT_BACKGROUND} from '../model'
vi.mock('../../video-background', () => ({
  prepareVideoBackground: vi.fn(),
  removeVideoBackground: vi.fn(async () => undefined),
}))
afterEach(async () => {
  await Dexie.delete('pomo-background')
})
it('should persist preferences, deduplicate renamed identical files and delete media', async () => {
  const repository = createWebRepository()
  expect(await repository.read()).toEqual({items: [], preferences: DEFAULT_BACKGROUND})
  await repository.configure({order: 'random'})
  const bytes = 'identical photo bytes'
  await repository.add(new File([bytes], 'one.png', {type: 'image/png'}), 'photo')
  await repository.add(new File([bytes], 'renamed.png', {type: 'image/png'}), 'photo')
  const snapshot = await repository.read()
  expect(snapshot.preferences.order).toBe('random')
  expect(snapshot.items).toHaveLength(1)
  expect(snapshot.items[0]).toMatchObject({kind: 'photo', name: 'one.png', size: bytes.length})
  const id = snapshot.items[0]!.id
  await expect(repository.load(id)).resolves.toBeDefined()
  await repository.remove(id)
  expect((await repository.read()).items).toEqual([])
  await expect(repository.load(id)).rejects.toThrow('missing')
})
