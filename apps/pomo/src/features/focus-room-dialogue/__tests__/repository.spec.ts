import {beforeEach, expect, it, vi} from 'vitest'

import {createFocusRoomDialogueRepository} from '../repository'

const databaseMocks = vi.hoisted(() => {
  const dialogues = {
    delete: vi.fn(async () => undefined),
    get: vi.fn(),
    orderBy: vi.fn(),
    put: vi.fn(async () => undefined),
  }
  const eventBindings = {
    delete: vi.fn(async () => undefined),
    get: vi.fn(async () => undefined),
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

vi.mock('dexie', () => ({
  default: function DexieMock() {
    return databaseMocks
  },
}))

vi.mock('../../model-storage/storage', () => ({
  createModelStorage: vi.fn(() => storageMocks),
  reportModelStorageError: reportStorageError,
}))

beforeEach(() => {
  vi.clearAllMocks()
  databaseMocks.version.mockReturnValue({stores: databaseMocks.stores})
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
  const repository = createFocusRoomDialogueRepository()

  await expect(repository.deleteDialogue('dialogue-id')).resolves.toBeUndefined()

  expect(databaseMocks.dialogues.delete).toHaveBeenCalledWith('dialogue-id')
  expect(reportStorageError).toHaveBeenCalledWith(storageError)
  repository.dispose()
  expect(databaseMocks.close).toHaveBeenCalledOnce()
})

it('should roll back newly written audio when metadata persistence fails', async () => {
  databaseMocks.dialogues.get.mockResolvedValue(undefined)
  databaseMocks.dialogues.put.mockRejectedValueOnce(new Error('database unavailable'))
  storageMocks.set.mockResolvedValue({ok: true, value: undefined})
  storageMocks.delete.mockResolvedValue({ok: true, value: true})
  const repository = createFocusRoomDialogueRepository()
  const dialogue = {
    audioKey: 'new-audio',
    createdAt: '2026-08-13T00:00:00.000Z',
    durationMs: 1000,
    id: 'new-dialogue',
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
