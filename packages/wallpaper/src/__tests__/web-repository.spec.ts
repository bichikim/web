/** @vitest-environment jsdom */
import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import {afterEach, expect, it, vi} from 'vitest'
import {createWebRepository} from '@winter-love/wallpaper/web-repository'

const repositories: ReturnType<typeof createWebRepository>[] = []
const openRepository = (databaseName: string) => {
  const repository = createWebRepository({databaseName})
  repositories.push(repository)
  return repository
}
afterEach(async () => {
  repositories.forEach((repository) => repository.close())
  repositories.length = 0
  await Dexie.delete('wallpaper-test-album')
  await Dexie.delete('wallpaper-test-other')
})

it('should retain media and settings after reopening without sharing another app database', async () => {
  const repository = openRepository('wallpaper-test-album')
  await repository.add(new File(['image'], 'one.png', {type: 'image/png'}), 'photo')
  await repository.configure({order: 'random'})
  const before = await repository.read()
  repository.close()
  expect(await openRepository('wallpaper-test-album').read()).toEqual(before)
  expect((await openRepository('wallpaper-test-other').read()).items).toEqual([])
})

it('should notify host video caches only for new content and after removal', async () => {
  const onVideoAdded = vi.fn()
  const onMediaRemoved = vi.fn(async () => undefined)
  const repository = createWebRepository({
    databaseName: 'wallpaper-test-album',
    onMediaRemoved,
    onVideoAdded,
  })
  repositories.push(repository)
  const file = new File(['video'], 'one.mp4', {type: 'video/mp4'})
  await repository.add(file, 'video')
  await repository.add(new File(['video'], 'renamed.mp4', {type: 'video/mp4'}), 'video')
  const {items} = await repository.read()
  expect(items).toHaveLength(1)
  expect(onVideoAdded).toHaveBeenCalledExactlyOnceWith(items[0]!.id, file)
  await repository.remove(items[0]!.id)
  expect(onMediaRemoved).toHaveBeenCalledExactlyOnceWith(items[0]!.id)
})
