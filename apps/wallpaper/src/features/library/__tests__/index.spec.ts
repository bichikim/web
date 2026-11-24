/** @vitest-environment jsdom */
import 'fake-indexeddb/auto'
import {cleanup, fireEvent, renderHook, waitFor} from '@solidjs/testing-library'
import {afterEach, expect, it, vi} from 'vitest'
import Dexie from 'dexie'
import flushPromises from 'flush-promises'
import {createLibraryRepository} from '@winter-love/wallpaper/settings/library-repository'
import {DEFAULT_POFFO_SPEECH} from '@winter-love/wallpaper/settings/library-model'
import {useWallpaperLibrary} from '..'
import {createBuiltinLibrary} from '../../builtin-assets/create-builtin-library'
import {codexConversation} from '../../conversation/codex'

vi.mock('../../builtin-assets/create-builtin-library', () => ({createBuiltinLibrary: vi.fn()}))
vi.mock('../../conversation/codex', () => ({
  codexConversation: {available: vi.fn(), models: vi.fn()},
}))
const repositories: ReturnType<typeof createLibraryRepository>[] = []
const names: string[] = []
it('should capture each input when edits and input switches are queued together', async () => {
  const name = `gaze-inputs-${crypto.randomUUID()}`
  const repository = createLibraryRepository(name)
  repositories.push(repository)
  names.push(name)
  const widget = await repository.addWidget('character')
  vi.mocked(createBuiltinLibrary).mockReturnValue(repository)
  vi.mocked(codexConversation.available).mockReturnValue(false)
  const hook = renderHook(useWallpaperLibrary)
  await waitFor(() => expect(hook.result.ready()).toBe(true), {interval: 1})
  const pending: Promise<unknown>[] = []
  for (const [mode, speed] of [
    ['cursor', 1],
    ['camera', 0.4],
    ['camera-pose', 2],
  ] as const) {
    pending.push(hook.result.trackWidget(widget.id, mode))
    pending.push(hook.result.configureTracking(widget.id, {headFollowSpeed: speed}))
    pending.push(hook.result.bindWidget(widget.id, {headX: {parameterId: mode}}))
    expect(hook.result.widgets()[0].trackingProfiles?.[mode]).toEqual({
      bindings: {headX: {parameterId: mode}},
      options: {headFollowSpeed: speed},
    })
  }
  await Promise.all(pending)
  const saved = (await repository.read()).widgets[0]
  expect(saved.tracking).toBe('camera-pose')
  expect(saved.trackingProfiles).toEqual({
    camera: {bindings: {headX: {parameterId: 'camera'}}, options: {headFollowSpeed: 0.4}},
    'camera-pose': {bindings: {headX: {parameterId: 'camera-pose'}}, options: {headFollowSpeed: 2}},
    cursor: {bindings: {headX: {parameterId: 'cursor'}}, options: {headFollowSpeed: 1}},
  })
  expect(hook.result.error()).toBeNull()
})
afterEach(async () => {
  cleanup()
  repositories.forEach((repository) => repository.close())
  await Promise.all(names.map((name) => Dexie.delete(name)))
  repositories.length = 0
  names.length = 0
  vi.resetAllMocks()
  vi.restoreAllMocks()
})

it('should ignore an obsolete library read failure after a newer snapshot succeeds', async () => {
  const name = `library-read-${crypto.randomUUID()}`
  const repository = createLibraryRepository(name)
  repositories.push(repository)
  names.push(name)
  await repository.addWidget('character')
  const initial = Promise.withResolvers<Awaited<ReturnType<typeof repository.read>>>()
  vi.spyOn(repository, 'read').mockReturnValueOnce(initial.promise)
  let notify: () => void = () => undefined
  vi.spyOn(repository, 'subscribe').mockImplementation((refresh) => {
    notify = refresh
    return vi.fn()
  })
  const report = vi.spyOn(console, 'error').mockImplementation(() => undefined)
  vi.mocked(createBuiltinLibrary).mockReturnValue(repository)
  const hook = renderHook(useWallpaperLibrary)
  notify()
  await waitFor(() => expect(hook.result.ready()).toBe(true), {interval: 1})
  initial.reject(new Error('obsolete read'))
  await initial.promise.catch(() => undefined)
  await new Promise<void>((resolve) => {
    const channel = new MessageChannel()
    channel.port1.onmessage = () => {
      channel.port1.close()
      channel.port2.close()
      resolve()
    }
    channel.port2.postMessage(null)
  })
  expect(hook.result.error()).toBeNull()
  expect(report).not.toHaveBeenCalled()
})

it('should persist local fallback for a removed model without opening speech settings', async () => {
  const name = `catalog-startup-${crypto.randomUUID()}`
  const repository = createLibraryRepository(name)
  repositories.push(repository)
  names.push(name)
  const widget = await repository.addWidget('builtin:ash')
  const speech = {
    ...DEFAULT_POFFO_SPEECH,
    conversation: {codexModel: 'retired', provider: 'codex' as const},
  }
  await repository.configureSpeech(widget.id, speech)
  vi.mocked(createBuiltinLibrary).mockReturnValue(repository)
  vi.mocked(codexConversation.available).mockReturnValue(true)
  vi.mocked(codexConversation.models).mockResolvedValue([
    {default: true, id: 'current', name: 'Current'},
  ])
  const hook = renderHook(useWallpaperLibrary)
  await waitFor(() =>
    expect(hook.result.widgets()[0]?.speech?.conversation).toEqual({provider: 'local'}),
  )
  await waitFor(async () => {
    const saved = (await repository.read()).widgets[0].speech
    expect(saved).toEqual({...speech, conversation: {provider: 'local'}})
  })
})

it('should retain the persisted model when catalog discovery fails', async () => {
  const name = `catalog-offline-${crypto.randomUUID()}`
  const repository = createLibraryRepository(name)
  repositories.push(repository)
  names.push(name)
  const widget = await repository.addWidget('builtin:ash')
  const conversation = {codexModel: 'selected', provider: 'codex' as const}
  await repository.configureSpeech(widget.id, {...DEFAULT_POFFO_SPEECH, conversation})
  vi.mocked(createBuiltinLibrary).mockReturnValue(repository)
  vi.mocked(codexConversation.available).mockReturnValue(true)
  vi.mocked(codexConversation.models).mockRejectedValue(new Error('offline'))
  const hook = renderHook(useWallpaperLibrary)
  await waitFor(() => expect(codexConversation.models).toHaveBeenCalledOnce())
  await flushPromises()
  expect(hook.result.widgets()[0]?.speech?.conversation).toEqual(conversation)
  expect((await repository.read()).widgets[0].speech?.conversation).toEqual(conversation)
})

it('should retain a newly selected model until a fresh catalog verifies it', async () => {
  const name = `catalog-upgrade-${crypto.randomUUID()}`
  const repository = createLibraryRepository(name)
  repositories.push(repository)
  names.push(name)
  const widget = await repository.addWidget('builtin:ash')
  await repository.configureSpeech(widget.id, {
    ...DEFAULT_POFFO_SPEECH,
    conversation: {codexModel: 'previous', provider: 'codex'},
  })
  vi.mocked(createBuiltinLibrary).mockReturnValue(repository)
  vi.mocked(codexConversation.available).mockReturnValue(true)
  vi.mocked(codexConversation.models).mockResolvedValue([
    {default: true, id: 'previous', name: 'Previous'},
  ])
  const hook = renderHook(useWallpaperLibrary)
  await waitFor(() => expect(codexConversation.models).toHaveBeenCalledOnce())
  await flushPromises()
  const speech = {
    ...DEFAULT_POFFO_SPEECH,
    conversation: {codexModel: 'newly-released', provider: 'codex' as const},
  }
  await hook.result.configureSpeech(widget.id, speech)
  expect(hook.result.widgets()[0]?.speech?.conversation).toEqual(speech.conversation)
  vi.mocked(codexConversation.models).mockResolvedValue([
    {default: true, id: 'newly-released', name: 'Newly released'},
  ])
  fireEvent(globalThis.window, new Event('focus'))
  await flushPromises()
  expect(hook.result.widgets()[0]?.speech?.conversation).toEqual(speech.conversation)
  expect((await repository.read()).widgets[0].speech?.conversation).toEqual(speech.conversation)
})
