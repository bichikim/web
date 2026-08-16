import {beforeEach, expect, it, vi} from 'vitest'

import {createPDialogueRepository} from '../repository'

const readBlobAsText = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.addEventListener('error', () => reject(reader.error))
    reader.addEventListener('load', () => resolve(String(reader.result)))
    reader.readAsText(blob)
  })

const databaseMocks = vi.hoisted(() => {
  const dialogues = {
    delete: vi.fn(async () => undefined),
    get: vi.fn(),
    orderBy: vi.fn(),
    put: vi.fn(async () => undefined),
  }
  const eventBindings = {
    delete: vi.fn(async () => undefined),
    get: vi.fn<(key: string) => Promise<unknown>>(async () => undefined),
    put: vi.fn(async () => undefined),
  }

  return {
    close: vi.fn(),
    dialogues,
    eventBindings,
    stores: vi.fn(),
    transaction: vi.fn(async (_mode, _dialogues, _eventBindings, callback: () => Promise<void>) =>
      callback(),
    ),
    version: vi.fn(),
  }
})
const storageMocks = vi.hoisted(() => ({
  delete: vi.fn(),
  get: vi.fn(),
  set: vi.fn(),
}))
const reportStorageError = vi.hoisted(() => vi.fn())
const legacyAudioMocks = vi.hoisted(() => ({compress: vi.fn()}))

vi.mock('dexie', () => ({
  default: function DexieMock() {
    return databaseMocks
  },
}))

vi.mock('../../model-storage/storage', () => ({
  createModelStorage: vi.fn(() => storageMocks),
  reportModelStorageError: reportStorageError,
}))

vi.mock('../compress-legacy-wave', () => ({compressLegacyWave: legacyAudioMocks.compress}))

beforeEach(() => {
  vi.clearAllMocks()
  databaseMocks.version.mockReturnValue({stores: databaseMocks.stores})
  storageMocks.delete.mockResolvedValue({ok: true, value: false})
  storageMocks.get.mockResolvedValue({ok: true, value: null})
  storageMocks.set.mockResolvedValue({ok: true, value: undefined})
  legacyAudioMocks.compress.mockResolvedValue(
    new Blob(['compressed'], {type: 'audio/ogg; codecs=opus'}),
  )
})

it('should finish metadata deletion when obsolete audio cleanup fails', async () => {
  const storageError = {cause: new Error('cache unavailable'), operation: 'delete' as const}
  databaseMocks.dialogues.get.mockResolvedValue({
    audioKey: 'audio-key',
    createdAt: '2026-08-13T00:00:00.000Z',
    durationMs: 1000,
    id: 'dialogue-id',
    modelId: 'full',
    segments: [{durationMs: 1000, index: 0, startMs: 0, text: '삭제할 대사'}],
    text: '삭제할 대사',
    updatedAt: '2026-08-13T00:00:00.000Z',
    version: 1,
    voiceId: 'Yuna',
  })
  storageMocks.delete.mockResolvedValue({error: storageError, ok: false})
  const repository = createPDialogueRepository()

  await expect(repository.deleteDialogue('dialogue-id')).resolves.toBeUndefined()

  expect(databaseMocks.dialogues.delete).toHaveBeenCalledWith('dialogue-id')
  expect(reportStorageError).toHaveBeenCalledWith(storageError)
  expect(storageMocks.delete.mock.calls.map(([path]) => path)).toEqual([
    '/__pomo/dialogue-audio/audio-key.opus',
    '/__pomo/dialogue-audio/audio-key.wav',
  ])
  repository.dispose()
  expect(databaseMocks.close).toHaveBeenCalledOnce()
})

it('should normalize a legacy entry binding to a dialogue sequence', async () => {
  databaseMocks.eventBindings.get.mockImplementation(async (event: string) =>
    event === 'room-enter'
      ? {dialogueId: 'legacy-dialogue', event: 'room-enter', version: 1}
      : undefined,
  )
  const repository = createPDialogueRepository()

  await expect(repository.listEventBindings()).resolves.toEqual([
    {dialogueIds: ['legacy-dialogue'], event: 'room-enter', version: 2},
  ])
})

it('should persist unique entry dialogues in their selected order', async () => {
  databaseMocks.dialogues.get.mockResolvedValue({id: 'stored'})
  const repository = createPDialogueRepository()

  await repository.setEntryBinding(['first', 'second', 'first'])

  expect(databaseMocks.dialogues.get.mock.calls).toEqual([['first'], ['second']])
  expect(databaseMocks.eventBindings.put).toHaveBeenCalledWith({
    dialogueIds: ['first', 'second'],
    event: 'room-enter',
    version: 2,
  })
})

it('should preserve remaining event dialogues when deleting one dialogue', async () => {
  databaseMocks.dialogues.get.mockResolvedValue({
    audioKey: 'first-audio',
    createdAt: '2026-08-13T00:00:00.000Z',
    durationMs: 1000,
    id: 'first',
    modelId: 'full',
    segments: [{durationMs: 1000, index: 0, startMs: 0, text: '첫 대사'}],
    text: '첫 대사',
    updatedAt: '2026-08-13T00:00:00.000Z',
    version: 1,
    voiceId: 'Yuna',
  })
  databaseMocks.eventBindings.get.mockImplementation(async (event: string) =>
    event === 'room-enter'
      ? {dialogueIds: ['first', 'second'], event: 'room-enter', version: 2}
      : undefined,
  )
  storageMocks.delete.mockResolvedValue({ok: true, value: true})
  const repository = createPDialogueRepository()

  await repository.deleteDialogue('first')

  expect(databaseMocks.eventBindings.put).toHaveBeenCalledWith({
    dialogueIds: ['second'],
    event: 'room-enter',
    version: 2,
  })
  expect(databaseMocks.eventBindings.delete).not.toHaveBeenCalled()
})

it('should roll back newly written audio when metadata persistence fails', async () => {
  databaseMocks.dialogues.get.mockResolvedValue(undefined)
  databaseMocks.dialogues.put.mockRejectedValueOnce(new Error('database unavailable'))
  storageMocks.set.mockResolvedValue({ok: true, value: undefined})
  storageMocks.delete.mockResolvedValue({ok: true, value: true})
  const repository = createPDialogueRepository()
  const dialogue = {
    audioKey: 'new-audio',
    createdAt: '2026-08-13T00:00:00.000Z',
    durationMs: 1000,
    id: 'new-dialogue',
    language: 'ko' as const,
    modelId: 'full' as const,
    segments: [{durationMs: 1000, index: 0, startMs: 0, text: '새 대사'}],
    text: '새 대사',
    updatedAt: '2026-08-13T00:00:00.000Z',
    version: 1 as const,
    voiceId: 'Yuna' as const,
  }

  await expect(repository.saveDialogue({audio: new Blob(['audio']), dialogue})).rejects.toThrow(
    'database unavailable',
  )

  expect(storageMocks.delete).toHaveBeenCalledWith('/__pomo/dialogue-audio/new-audio.wav')
})

it('should store new compressed audio as Opus', async () => {
  databaseMocks.dialogues.get.mockResolvedValue(undefined)
  const repository = createPDialogueRepository()
  const dialogue = {
    audioKey: 'compressed-audio',
    createdAt: '2026-08-13T00:00:00.000Z',
    durationMs: 1000,
    id: 'compressed-dialogue',
    language: 'ko' as const,
    modelId: 'full' as const,
    segments: [{durationMs: 1000, index: 0, startMs: 0, text: '압축 대사'}],
    text: '압축 대사',
    updatedAt: '2026-08-13T00:00:00.000Z',
    version: 1 as const,
    voiceId: 'Yuna' as const,
  }

  await repository.saveDialogue({
    audio: new Blob(['opus'], {type: 'audio/ogg; codecs=opus'}),
    dialogue,
  })

  expect(storageMocks.set).toHaveBeenCalledWith(
    '/__pomo/dialogue-audio/compressed-audio.opus',
    expect.any(Response),
  )
})

it('should prefer stored Opus audio without migrating legacy audio', async () => {
  const repository = createPDialogueRepository()
  storageMocks.get.mockImplementation(async (path: string) => {
    const isOpus = path.endsWith('.opus')

    return {
      ok: true,
      value: new Response(isOpus ? 'opus' : 'wav', {
        headers: {'Content-Type': isOpus ? 'audio/ogg; codecs=opus' : 'audio/wav'},
      }),
    }
  })

  const audio = await repository.getAudio('compressed')

  expect(audio?.type).toBe('audio/ogg;codecs=opus')
  await expect(readBlobAsText(audio as Blob)).resolves.toBe('opus')
  expect(legacyAudioMocks.compress).not.toHaveBeenCalled()
})

it('should migrate legacy WAV audio to Opus when it is first read', async () => {
  const wavAudio = new Blob(['wav'], {type: 'audio/wav'})
  const compressedAudio = new Blob(['compressed'], {type: 'audio/ogg; codecs=opus'})
  legacyAudioMocks.compress.mockResolvedValue(compressedAudio)
  const repository = createPDialogueRepository()

  storageMocks.get.mockImplementation(async (path: string) => ({
    ok: true,
    value: path.endsWith('.wav') ? new Response(wavAudio) : null,
  }))
  await expect(repository.getAudio('legacy')).resolves.toEqual(compressedAudio)
  expect(legacyAudioMocks.compress).toHaveBeenCalledOnce()
  expect(storageMocks.set).toHaveBeenCalledWith(
    '/__pomo/dialogue-audio/legacy.opus',
    expect.any(Response),
  )
  expect(storageMocks.delete).toHaveBeenCalledWith('/__pomo/dialogue-audio/legacy.wav')
  expect(storageMocks.get.mock.calls.map(([path]) => path)).toEqual([
    '/__pomo/dialogue-audio/legacy.opus',
    '/__pomo/dialogue-audio/legacy.wav',
  ])
})

it('should share one legacy migration between simultaneous audio reads', async () => {
  const wavAudio = new Blob(['wav'], {type: 'audio/wav'})
  let finishCompression: ((audio: Blob) => void) | undefined
  legacyAudioMocks.compress.mockReturnValue(
    new Promise<Blob>((resolve) => {
      finishCompression = resolve
    }),
  )
  storageMocks.get.mockImplementation(async (path: string) => ({
    ok: true,
    value: path.endsWith('.wav') ? new Response(wavAudio) : null,
  }))
  const repository = createPDialogueRepository()

  const firstRead = repository.getAudio('legacy')
  const secondRead = repository.getAudio('legacy')
  await vi.waitFor(() => expect(legacyAudioMocks.compress).toHaveBeenCalledOnce())
  const compressedAudio = new Blob(['compressed'], {type: 'audio/ogg; codecs=opus'})
  finishCompression?.(compressedAudio)

  await expect(Promise.all([firstRead, secondRead])).resolves.toEqual([
    compressedAudio,
    compressedAudio,
  ])
})

it('should keep legacy WAV playback when compression fails', async () => {
  legacyAudioMocks.compress.mockRejectedValue(new Error('encoder unavailable'))
  storageMocks.get.mockImplementation(async (path: string) => ({
    ok: true,
    value: path.endsWith('.wav')
      ? new Response('wav', {headers: {'Content-Type': 'audio/wav'}})
      : null,
  }))
  vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  const repository = createPDialogueRepository()

  const audio = await repository.getAudio('legacy')

  expect(audio?.type).toBe('audio/wav')
  await expect(readBlobAsText(audio as Blob)).resolves.toBe('wav')
  expect(storageMocks.set).not.toHaveBeenCalled()
  expect(storageMocks.delete).not.toHaveBeenCalled()
})

it('should persist and remove bindings for every supported dialogue event', async () => {
  databaseMocks.dialogues.get.mockResolvedValue({id: 'dialogue-id'})
  databaseMocks.eventBindings.get.mockImplementation(async (event: string) =>
    event === 'focus-start'
      ? {dialogueId: 'dialogue-id', event: 'focus-start', version: 1}
      : undefined,
  )
  const repository = createPDialogueRepository()

  await expect(repository.listEventBindings()).resolves.toEqual([
    {dialogueIds: ['dialogue-id'], event: 'focus-start', version: 2},
  ])
  await repository.setEventBinding('break-end', 'dialogue-id')
  expect(databaseMocks.eventBindings.put).toHaveBeenCalledWith({
    dialogueIds: ['dialogue-id'],
    event: 'break-end',
    version: 2,
  })

  await repository.setEventBinding('break-end', null)
  expect(databaseMocks.eventBindings.delete).toHaveBeenCalledWith('break-end')
})
