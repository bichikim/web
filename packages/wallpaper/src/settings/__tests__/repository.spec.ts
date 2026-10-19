/** @vitest-environment jsdom */
import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import {afterEach, expect, it} from 'vitest'
import {createSettingsRepository} from '@winter-love/wallpaper/settings/repository'
import {createMonitorWallpaper} from '@winter-love/wallpaper/settings/model'

const repositories: ReturnType<typeof createSettingsRepository>[] = []
afterEach(async () => {
  repositories.forEach((repository) => repository.close())
  repositories.length = 0
  await Dexie.delete('wallpaper-test-settings')
})

const openRepository = () => {
  const repository = createSettingsRepository('wallpaper-test-settings')
  repositories.push(repository)
  return repository
}

it('should persist independent monitor settings across repository reopen', async () => {
  const repository = openRepository()
  const first = {
    ...createMonitorWallpaper('first'),
    content: {
      assetId: 'character',
      mode: 'puppet' as const,
      trackingOptions: {eyeCenterX: -0.2, eyeCenterY: 0.3, headCenterX: 4, headCenterY: -5},
    },
  }
  const second = {
    ...createMonitorWallpaper('second'),
    content: {mode: 'website' as const, url: 'https://example.com'},
  }
  await repository.save(first)
  await repository.save(second)
  repository.close()
  expect(await openRepository().read()).toEqual([first, second])
})

it('should reject invalid settings without replacing the previous value', async () => {
  const repository = openRepository()
  const valid = createMonitorWallpaper('first')
  await repository.save(valid)
  await expect(repository.save({...valid, monitorId: ''})).rejects.toThrow()
  expect(await repository.read()).toEqual([valid])
})

it('should reopen legacy input settings and persist only the selected input state', async () => {
  const database = new Dexie('wallpaper-test-settings')
  database.version(1).stores({monitors: '&monitorId', puppets: '&id'})
  await database.table('monitors').bulkPut(
    ['hold', 'modifierHold', 'always'].map((activation) => ({
      ...createMonitorWallpaper(activation),
      interaction: {activation, holdSeconds: 3, idleSeconds: 30, modifier: 'alt'},
    })),
  )
  database.close()
  const repository = openRepository()
  const settings = await repository.read()
  expect(settings.map((entry) => [entry.monitorId, entry.interaction])).toEqual([
    ['always', {activation: 'always'}],
    ['hold', {activation: 'passThrough'}],
    ['modifierHold', {activation: 'passThrough'}],
  ])
  const changed = {...settings[1]!, interaction: {activation: 'always' as const}}
  await repository.save(changed)
  repository.close()
  expect((await openRepository().read()).find((entry) => entry.monitorId === 'hold')).toEqual(
    changed,
  )
})

it('should share Puppet assets across monitors and clear references when deleting one', async () => {
  const repository = openRepository()
  const asset = await repository.addPuppet('character.json', '{"format":"puppet"}')
  const first = {
    ...createMonitorWallpaper('first'),
    content: {assetId: asset.id, mode: 'puppet' as const},
  }
  const second = {
    ...createMonitorWallpaper('second'),
    content: {assetId: asset.id, mode: 'puppet' as const},
  }
  await repository.save(first)
  await repository.save(second)
  expect(await repository.loadPuppet(asset.id)).toBe('{"format":"puppet"}')
  await repository.removePuppet(asset.id)
  expect((await repository.read()).map((monitor) => monitor.content)).toEqual([
    {assetId: null, mode: 'puppet'},
    {assetId: null, mode: 'puppet'},
  ])
  await expect(repository.loadPuppet(asset.id)).rejects.toThrow('missing')
})
