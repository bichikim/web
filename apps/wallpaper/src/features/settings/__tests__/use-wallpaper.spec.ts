/** @vitest-environment jsdom */
import 'fake-indexeddb/auto'
import {renderHook, waitFor} from '@solidjs/testing-library'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {
  createSettingsRepository,
  type SettingsRepository,
} from '@winter-love/wallpaper/settings/repository'
import {createMonitorWallpaper, type MonitorWallpaper} from '@winter-love/wallpaper/settings/model'
import {
  createWebRepository,
  type WebBackgroundRepository,
} from '@winter-love/wallpaper/web-repository'
import {type BackgroundMedia, DEFAULT_BACKGROUND} from '@winter-love/wallpaper/model'
import {listWallpaperMonitors} from '../monitors'
import {useWallpaper} from '../use-wallpaper'

vi.mock('@winter-love/wallpaper/settings/repository', () => ({createSettingsRepository: vi.fn()}))
vi.mock('@winter-love/wallpaper/web-repository', () => ({createWebRepository: vi.fn()}))
vi.mock('../monitors', () => ({listWallpaperMonitors: vi.fn()}))

let stored: Map<string, MonitorWallpaper>
let repository: SettingsRepository
let media: WebBackgroundRepository

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
  stored = new Map()
  repository = {
    addPuppet: vi.fn(),
    close: vi.fn(),
    listPuppets: vi.fn(async () => []),
    loadPuppet: vi.fn(),
    read: vi.fn(async () => Array.from(stored.values())),
    removeMediaReferences: vi.fn(),
    removePuppet: vi.fn(),
    save: vi.fn(async (settings) => {
      stored.set(settings.monitorId, settings)
    }),
    subscribe: vi.fn(() => vi.fn()),
  }
  media = {
    add: vi.fn(),
    close: vi.fn(),
    configure: vi.fn(),
    importMedia: vi.fn(),
    load: vi.fn(),
    read: vi.fn(async () => ({items: [], preferences: DEFAULT_BACKGROUND})),
    remove: vi.fn(),
    subscribe: vi.fn(() => vi.fn()),
  }
  vi.mocked(createSettingsRepository).mockReturnValue(repository)
  vi.mocked(createWebRepository).mockReturnValue(media)
  vi.mocked(listWallpaperMonitors).mockResolvedValue([
    {id: 'first', name: 'First'},
    {id: 'second', name: 'Second'},
  ])
})
afterEach(() => {
  vi.clearAllMocks()
  vi.restoreAllMocks()
})

it('should retain a queued change on the selected monitor when selection changes immediately', async () => {
  const {result, cleanup} = renderHook(useWallpaper)
  await waitFor(() => expect(result.selectedId()).toBe('first'))
  const saving = result.setInteraction({activation: 'always'})
  result.selectMonitor('second')
  await saving
  expect(stored.get('first')?.interaction.activation).toBe('always')
  expect(result.current()?.monitorId).toBe('second')
  expect(result.current()?.interaction.activation).toBe('passThrough')
  cleanup()
})

it('should serialize input and album updates without losing either change', async () => {
  const {result, cleanup} = renderHook(useWallpaper)
  await waitFor(() => expect(result.selectedId()).toBe('first'))
  await Promise.all([result.setInteraction({activation: 'always'}), result.toggleMedia('video')])
  expect(result.current()?.interaction).toEqual({activation: 'always'})
  expect(result.current()?.content).toMatchObject({mediaIds: ['video']})
  expect(result.busy()).toBe(false)
  cleanup()
})

it('should reflect consecutive edits immediately without disabling settings while a write is pending', async () => {
  const {result, cleanup} = renderHook(useWallpaper)
  await waitFor(() => expect(result.selectedId()).toBe('first'))
  const write = Promise.withResolvers<void>()
  vi.mocked(repository.save).mockImplementationOnce(async (settings) => {
    await write.promise
    stored.set(settings.monitorId, settings)
  })
  const first = result.setInteraction({activation: 'always'})
  expect(result.current()?.interaction.activation).toBe('always')
  const second = result.toggleMedia('video')
  expect(result.current()?.content).toMatchObject({mediaIds: ['video']})
  expect(result.busy()).toBe(false)
  write.resolve()
  await Promise.all([first, second])
  expect(stored.get('first')?.interaction).toEqual({activation: 'always'})
  expect(stored.get('first')?.content).toMatchObject({mediaIds: ['video']})
  cleanup()
})

it('should roll back only a failed edit while retaining a later independent optimistic change', async () => {
  const {result, cleanup} = renderHook(useWallpaper)
  await waitFor(() => expect(result.selectedId()).toBe('first'))
  const write = Promise.withResolvers<void>()
  vi.mocked(repository.save).mockReturnValueOnce(write.promise)
  const first = result.setInteraction({activation: 'always'})
  const second = result.toggleMedia('video')
  expect(result.current()?.interaction).toEqual({activation: 'always'})
  expect(result.current()?.content).toMatchObject({mediaIds: ['video']})
  write.reject(new Error('quota'))
  await Promise.all([first, second])
  expect(result.current()?.interaction).toEqual({activation: 'passThrough'})
  expect(stored.get('first')?.interaction).toEqual({activation: 'passThrough'})
  expect(stored.get('first')?.content).toMatchObject({mediaIds: ['video']})
  expect(result.error()).toBe('설정을 저장하지 못했어요.')
  cleanup()
})

it('should retain the last checkbox intent when an earlier rapid toggle fails', async () => {
  const {result, cleanup} = renderHook(useWallpaper)
  await waitFor(() => expect(result.selectedId()).toBe('first'))
  const write = Promise.withResolvers<void>()
  vi.mocked(repository.save).mockReturnValueOnce(write.promise)
  const first = result.toggleMedia('video')
  expect(result.current()?.content).toMatchObject({mediaIds: ['video']})
  const second = result.toggleMedia('video')
  expect(result.current()?.content).toMatchObject({mediaIds: []})
  write.reject(new Error('quota'))
  await Promise.all([first, second])
  expect(stored.get('first')?.content).toMatchObject({mediaIds: []})
  cleanup()
})

it('should not restore a failed album field when a later content edit succeeds', async () => {
  const {result, cleanup} = renderHook(useWallpaper)
  await waitFor(() => expect(result.selectedId()).toBe('first'))
  const original = result.current()!.content
  if (original.mode !== 'album') {
    throw new Error('Expected album')
  }
  const write = Promise.withResolvers<void>()
  vi.mocked(repository.save).mockReturnValueOnce(write.promise)
  const first = result.setContent({...original, photoSeconds: 20})
  const optimistic = result.current()!.content
  if (optimistic.mode !== 'album') {
    throw new Error('Expected album')
  }
  const second = result.setContent({...optimistic, transition: 'none'})
  expect(result.current()?.content).toMatchObject({photoSeconds: 20, transition: 'none'})
  write.reject(new Error('quota'))
  await Promise.all([first, second])
  expect(stored.get('first')?.content).toMatchObject({photoSeconds: 10, transition: 'none'})
  cleanup()
})

it('should not flicker optimistic edits when repository subscriptions refresh a pending write', async () => {
  const {result, cleanup} = renderHook(useWallpaper)
  await waitFor(() => expect(result.selectedId()).toBe('first'))
  const write = Promise.withResolvers<void>()
  vi.mocked(repository.save).mockImplementationOnce(async (settings) => {
    stored.set(settings.monitorId, settings)
    vi.mocked(repository.subscribe).mock.calls[0]![0]()
    await write.promise
  })
  const first = result.toggleMedia('video')
  const second = result.setInteraction({activation: 'always'})
  await waitFor(() => expect(repository.save).toHaveBeenCalledOnce())
  expect(result.current()?.content).toMatchObject({mediaIds: ['video']})
  expect(result.current()?.interaction.activation).toBe('always')
  write.resolve()
  await Promise.all([first, second])
  expect(result.current()?.content).toMatchObject({mediaIds: ['video']})
  cleanup()
})

it('should preserve media identities across settings refreshes while applying metadata changes', async () => {
  let name = 'Photo'
  vi.mocked(media.read).mockImplementation(async () => ({
    items: [{id: 'photo', kind: 'photo', name, size: 1}],
    preferences: DEFAULT_BACKGROUND,
  }))
  const {result, cleanup} = renderHook(useWallpaper)
  await waitFor(() => expect(result.items().find((item) => item.id === 'photo')).toBeDefined())
  const original = result.items().find((item) => item.id === 'photo')
  name = 'Renamed photo'
  await result.setInteraction({activation: 'always'})
  expect(result.items().find((item) => item.id === 'photo')).toBe(original)
  expect(result.items().find((item) => item.id === 'photo')?.name).toBe(name)
  cleanup()
})

it('should apply additions removals and reordering without replacing retained media', async () => {
  const first: BackgroundMedia = {id: 'first', kind: 'photo', name: 'First', size: 1}
  const second: BackgroundMedia = {id: 'second', kind: 'photo', name: 'Second', size: 1}
  let files = [first, second]
  vi.mocked(media.read).mockImplementation(async () => ({
    items: files,
    preferences: DEFAULT_BACKGROUND,
  }))
  const {result, cleanup} = renderHook(useWallpaper)
  await waitFor(() => expect(result.items().find((item) => item.id === 'second')).toBeDefined())
  const retained = result.items().find((item) => item.id === 'second')
  files = [{...second}, {id: 'third', kind: 'photo', name: 'Third', size: 1}]
  await result.setInteraction({activation: 'always'})
  expect(
    result
      .items()
      .filter((item) => !item.id.startsWith('builtin:'))
      .map((item) => item.id),
  ).toEqual(['second', 'third'])
  expect(result.items().find((item) => item.id === 'second')).toBe(retained)
  cleanup()
})

it('should retain persisted settings when storage fails and allow the next operation', async () => {
  stored.set('first', createMonitorWallpaper('first'))
  const {result, cleanup} = renderHook(useWallpaper)
  await waitFor(() => expect(result.selectedId()).toBe('first'))
  vi.mocked(repository.save).mockRejectedValueOnce(new Error('quota'))
  await result.setInteraction({activation: 'always'})
  expect(result.current()?.interaction.activation).toBe('passThrough')
  expect(result.error()).toBe('설정을 저장하지 못했어요.')
  expect(console.error).toHaveBeenCalledWith(
    'Wallpaper operation failed',
    expect.objectContaining({message: 'quota'}),
  )
  await result.setInteraction({activation: 'always'})
  expect(result.current()?.interaction.activation).toBe('always')
  expect(result.error()).toBeNull()
  cleanup()
})

it('should reject an invalid URL before exposing it to the preview and permit the next valid edit', async () => {
  const {result, cleanup} = renderHook(useWallpaper)
  await waitFor(() => expect(result.selectedId()).toBe('first'))
  await result.changeMode('website')
  const saving = result.setContent({mode: 'website', url: 'not-a-url'})
  expect(result.current()?.content).toEqual({mode: 'website', url: null})
  await saving
  expect(result.error()).toBe('설정을 저장하지 못했어요.')
  await result.setContent({mode: 'website', url: 'https://example.com'})
  expect(result.current()?.content).toEqual({mode: 'website', url: 'https://example.com'})
  expect(result.error()).toBeNull()
  cleanup()
})

it('should stop subscriptions immediately and close owned repositories after pending writes finish', async () => {
  const unsubscribeSettings = vi.fn()
  const unsubscribeMedia = vi.fn()
  vi.mocked(repository.subscribe).mockReturnValue(unsubscribeSettings)
  vi.mocked(media.subscribe).mockReturnValue(unsubscribeMedia)
  const {result, cleanup} = renderHook(useWallpaper)
  await waitFor(() => expect(result.selectedId()).toBe('first'))
  const write = Promise.withResolvers<void>()
  vi.mocked(repository.save).mockReturnValueOnce(write.promise)
  const saving = result.setInteraction({activation: 'always'})
  await waitFor(() => expect(repository.save).toHaveBeenCalledOnce())
  cleanup()
  expect(unsubscribeSettings).toHaveBeenCalledOnce()
  expect(unsubscribeMedia).toHaveBeenCalledOnce()
  expect(repository.close).not.toHaveBeenCalled()
  write.resolve()
  await saving
  expect(repository.close).toHaveBeenCalledOnce()
  expect(media.close).toHaveBeenCalledOnce()
})

it('should expose bundled content without importing or replacing saved monitor settings', async () => {
  const original = {
    ...createMonitorWallpaper('first'),
    content: {mode: 'website' as const, url: 'https://example.com'},
  }
  stored.set('first', original)
  const {result, cleanup} = renderHook(useWallpaper)
  await waitFor(() => expect(result.puppets()).toContainEqual({id: 'builtin:ash', name: '애시'}))
  expect(result.items().filter((item) => item.id.startsWith('builtin:cover:'))).toHaveLength(10)
  expect(result.current()?.content).toEqual(original.content)
  expect(repository.save).not.toHaveBeenCalled()
  expect(repository.addPuppet).not.toHaveBeenCalled()
  expect(media.importMedia).not.toHaveBeenCalled()
  cleanup()
})

it('should persist album fit and keep it when a subsequent independent album field changes', async () => {
  const {result, cleanup} = renderHook(useWallpaper)
  await waitFor(() => expect(result.selectedId()).toBe('first'))
  const original = result.current()!.content
  if (original.mode !== 'album') {
    throw new Error('Expected album')
  }
  const fitting = result.setContent({...original, fit: 'cover'})
  const optimistic = result.current()!.content
  if (optimistic.mode !== 'album') {
    throw new Error('Expected album')
  }
  const timing = result.setContent({...optimistic, photoSeconds: 20})
  await Promise.all([fitting, timing])
  expect(stored.get('first')?.content).toMatchObject({fit: 'cover', photoSeconds: 20})
  cleanup()
})

it('should remove album references before deleting stored media', async () => {
  const {result, cleanup} = renderHook(useWallpaper)
  await waitFor(() => expect(result.selectedId()).toBe('first'))
  const references = Promise.withResolvers<void>()
  vi.mocked(repository.removeMediaReferences).mockReturnValueOnce(references.promise)
  const removing = result.removeMedia('photo')
  await waitFor(() => expect(repository.removeMediaReferences).toHaveBeenCalledWith('photo'))
  expect(media.remove).not.toHaveBeenCalled()
  references.resolve()
  await removing
  expect(media.remove).toHaveBeenCalledWith('photo')
  expect(result.error()).toBeNull()
  cleanup()
})

it('should retain stored media when reference cleanup fails and permit retry', async () => {
  const {result, cleanup} = renderHook(useWallpaper)
  await waitFor(() => expect(result.selectedId()).toBe('first'))
  vi.mocked(repository.removeMediaReferences).mockRejectedValueOnce(new Error('storage'))
  await result.removeMedia('photo')
  expect(media.remove).not.toHaveBeenCalled()
  expect(result.error()).toBe('사진·동영상을 삭제하지 못했어요.')
  await result.removeMedia('photo')
  expect(media.remove).toHaveBeenCalledWith('photo')
  expect(result.error()).toBeNull()
  cleanup()
})
