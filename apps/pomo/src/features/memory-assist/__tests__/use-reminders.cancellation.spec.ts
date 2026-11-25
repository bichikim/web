/** @vitest-environment jsdom */

import {renderHook} from '@solidjs/testing-library'
import {createSignal, type Setter} from 'solid-js'
import {PreferenceProvider} from 'src/hooks/use-preference'
import flushPromises from 'flush-promises'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import type {PEventContextValue} from '../../focus-room-dialogue'
import {
  generateCompressedDialogueAudio,
  type GenerateCompressedDialogueAudioResult,
} from '../../focus-room-dialogue/generate-dialogue-audio'
import {createMemoryMemo} from '../schedule'
import type {MemoryMemo} from '../schema'
import {useMemoryReminders} from '../use-reminders'
import {createOpusBlob} from '../../supertonic/opus-client'
import {createSupertonicClient} from '../../supertonic/client'
import type {SupertonicWorkerOutput} from '../../supertonic/messages'

const mocks = vi.hoisted(() => ({
  cancelGeneration: vi.fn(),
  createClient: vi.fn(),
  createRepository: vi.fn(),
  deleteDialogue: vi.fn(),
  disposeClient: vi.fn(),
  disposeRepository: vi.fn(),
  generateAudio: vi.fn(),
  initializeClient: vi.fn(),
  loadSettings: vi.fn(),
  readMemos: vi.fn<() => ReadonlyArray<MemoryMemo>>(),
  saveDialogue: vi.fn(),
  updateMemos: vi.fn(),
}))

vi.mock('../use-deletion-recovery', () => ({useDeletionRecovery: vi.fn()}))
vi.mock('../deletion-runtime', () => ({memoryMemoDeletion: {retry: vi.fn()}}))
vi.mock('../use-memos', () => ({useMemoryMemos: () => mocks.readMemos}))
vi.mock('../repository', () => ({updateMemoryMemos: mocks.updateMemos}))
vi.mock('../../focus-room-dialogue', () => ({
  createPDialogueRepository: mocks.createRepository,
  generateCompressedDialogueAudio: mocks.generateAudio,
}))
vi.mock('../../supertonic', () => ({
  createSupertonicClient: mocks.createClient,
  getSupertonicErrorMessage: () => 'voice failed',
}))

vi.mock('../../supertonic/opus-client', () => ({createOpusBlob: vi.fn()}))

let setMemos: Setter<ReadonlyArray<MemoryMemo>>

const createDueMemo = (id: string) =>
  createMemoryMemo({
    exactReminderAt: '2026-09-04T03:00:00.000Z',
    id,
    now: new Date('2026-09-04T02:00:00.000Z'),
    random: () => 0,
    recallMode: 'none',
    text: id,
  })

const createAudio = (): GenerateCompressedDialogueAudioResult => ({
  ok: true,
  value: {audio: new Blob(['opus']), durationMs: 100, segments: []},
})

const renderReminders = () => {
  const events = {
    playDialogue: vi.fn().mockResolvedValue(true),
    refreshDialogues: vi.fn().mockResolvedValue(undefined),
  } as unknown as PEventContextValue
  const view = renderHook(
    () => useMemoryReminders({events, loadSettings: mocks.loadSettings, random: () => 0}),
    {wrapper: PreferenceProvider},
  )
  return {events, view}
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-09-04T03:00:00.000Z'))
  vi.resetAllMocks()
  vi.mocked(createOpusBlob).mockResolvedValue(new Blob(['opus']))
  const [memos, updateMemos] = createSignal<ReadonlyArray<MemoryMemo>>([
    createDueMemo('memo-1'),
    createDueMemo('memo-2'),
  ])
  setMemos = updateMemos
  mocks.readMemos.mockImplementation(memos)
  mocks.createClient.mockReturnValue({
    cancelGeneration: mocks.cancelGeneration,
    dispose: mocks.disposeClient,
    initialize: mocks.initializeClient,
  })
  mocks.initializeClient.mockResolvedValue({ok: true, value: undefined})
  mocks.loadSettings.mockResolvedValue({modelId: 'int8', version: 1, voiceId: 'Yuna'})
  mocks.createRepository.mockReturnValue({
    deleteDialogue: mocks.deleteDialogue,
    dispose: mocks.disposeRepository,
    saveDialogue: mocks.saveDialogue,
  })
  mocks.deleteDialogue.mockResolvedValue(undefined)
  mocks.saveDialogue.mockResolvedValue(undefined)
  mocks.generateAudio.mockImplementation(async () => createAudio())
  mocks.updateMemos.mockImplementation(async (update) => {
    setMemos(update)
    return mocks.readMemos()
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

it.each(['removed', 'pending'] as const)(
  'should cancel a %s memo and await settlement before the next delivery',
  async (mode) => {
    const generation = Promise.withResolvers<GenerateCompressedDialogueAudioResult>()
    mocks.generateAudio.mockReturnValueOnce(generation.promise)
    const {events, view} = renderReminders()

    try {
      await vi.advanceTimersToNextTimerAsync()
      expect(mocks.generateAudio).toHaveBeenCalledOnce()
      setMemos((memos) =>
        mode === 'removed'
          ? memos.filter((memo) => memo.id !== 'memo-1')
          : memos.map((memo) => (memo.id === 'memo-1' ? {...memo, deletionPending: true} : memo)),
      )
      await flushPromises()

      expect(mocks.cancelGeneration).toHaveBeenCalledOnce()
      setMemos((memos) => [...memos])
      await flushPromises()
      expect(mocks.cancelGeneration).toHaveBeenCalledOnce()
      expect(mocks.generateAudio).toHaveBeenCalledOnce()
      expect(mocks.saveDialogue).not.toHaveBeenCalled()
      expect(events.playDialogue).not.toHaveBeenCalled()
      expect(mocks.disposeClient).not.toHaveBeenCalled()

      generation.resolve({message: 'cancelled', ok: false})
      await flushPromises()
      await vi.advanceTimersToNextTimerAsync()
      await flushPromises()

      expect(mocks.generateAudio).toHaveBeenCalledTimes(2)
      expect(mocks.generateAudio).toHaveBeenLastCalledWith(
        expect.objectContaining({text: 'memo-2'}),
      )
      expect(events.playDialogue).toHaveBeenCalledOnce()
      expect(mocks.createClient).toHaveBeenCalledOnce()
      expect(view.result.skippedReminders()).toEqual([])
    } finally {
      generation.resolve({message: 'cancelled', ok: false})
      await flushPromises()
      view.cleanup()
    }
  },
)

it('should discard a late successful result and await its cleanup before the next generation', async () => {
  const generation = Promise.withResolvers<GenerateCompressedDialogueAudioResult>()
  const deletion = Promise.withResolvers<void>()
  mocks.generateAudio.mockReturnValueOnce(generation.promise)
  mocks.deleteDialogue.mockReturnValueOnce(deletion.promise)
  const {events, view} = renderReminders()

  try {
    await vi.advanceTimersToNextTimerAsync()
    setMemos((memos) => memos.filter((memo) => memo.id !== 'memo-1'))
    await flushPromises()
    expect(mocks.cancelGeneration).toHaveBeenCalledOnce()

    generation.resolve(createAudio())
    await flushPromises()
    expect(mocks.saveDialogue).toHaveBeenCalledOnce()
    const savedId = mocks.saveDialogue.mock.calls[0]![0].dialogue.id
    expect(mocks.deleteDialogue).toHaveBeenCalledWith(savedId)
    expect(mocks.generateAudio).toHaveBeenCalledOnce()
    expect(events.playDialogue).not.toHaveBeenCalled()

    deletion.resolve()
    await flushPromises()
    await vi.advanceTimersToNextTimerAsync()
    await flushPromises()

    expect(mocks.generateAudio).toHaveBeenCalledTimes(2)
    expect(events.playDialogue).toHaveBeenCalledOnce()
    expect(events.playDialogue).not.toHaveBeenCalledWith(savedId)
  } finally {
    generation.resolve(createAudio())
    deletion.resolve()
    await flushPromises()
    view.cleanup()
  }
})

it('should recheck deletion after initialization and generate only the next due memo', async () => {
  const initialization = Promise.withResolvers<{ok: true; value: undefined}>()
  mocks.initializeClient.mockReturnValueOnce(initialization.promise)
  const {events, view} = renderReminders()

  try {
    await vi.advanceTimersToNextTimerAsync()
    expect(mocks.initializeClient).toHaveBeenCalledOnce()
    setMemos((memos) => memos.filter((memo) => memo.id !== 'memo-1'))
    await flushPromises()
    expect(mocks.cancelGeneration).not.toHaveBeenCalled()

    initialization.resolve({ok: true, value: undefined})
    await flushPromises()
    await vi.advanceTimersToNextTimerAsync()
    await flushPromises()

    expect(mocks.generateAudio).toHaveBeenCalledOnce()
    expect(mocks.generateAudio).toHaveBeenCalledWith(expect.objectContaining({text: 'memo-2'}))
    expect(mocks.saveDialogue).toHaveBeenCalledOnce()
    expect(events.playDialogue).toHaveBeenCalledOnce()
  } finally {
    initialization.resolve({ok: true, value: undefined})
    await flushPromises()
    view.cleanup()
  }
})

it('should skip a deleted memo after settings load without initializing its voice client', async () => {
  const settings = Promise.withResolvers<{modelId: 'int8'; version: 1; voiceId: 'Yuna'}>()
  mocks.loadSettings.mockReturnValueOnce(settings.promise)
  const {view} = renderReminders()

  try {
    await vi.advanceTimersToNextTimerAsync()
    setMemos([])
    settings.resolve({modelId: 'int8', version: 1, voiceId: 'Yuna'})
    await flushPromises()

    expect(mocks.createClient).not.toHaveBeenCalled()
    expect(mocks.generateAudio).not.toHaveBeenCalled()
    expect(mocks.saveDialogue).not.toHaveBeenCalled()
    expect(vi.getTimerCount()).toBe(0)
  } finally {
    settings.resolve({modelId: 'int8', version: 1, voiceId: 'Yuna'})
    await flushPromises()
    view.cleanup()
  }
})

it('should retain repository ownership until a cancelled generation settles after owner disposal', async () => {
  const generation = Promise.withResolvers<GenerateCompressedDialogueAudioResult>()
  mocks.generateAudio.mockReturnValueOnce(generation.promise)
  const {events, view} = renderReminders()

  try {
    await vi.advanceTimersToNextTimerAsync()
    setMemos((memos) => memos.filter((memo) => memo.id !== 'memo-1'))
    await flushPromises()
    expect(mocks.cancelGeneration).toHaveBeenCalledOnce()
    view.cleanup()
    expect(mocks.disposeClient).toHaveBeenCalledOnce()
    expect(mocks.disposeRepository).not.toHaveBeenCalled()

    generation.resolve(createAudio())
    await flushPromises()

    expect(mocks.deleteDialogue).toHaveBeenCalledOnce()
    expect(mocks.disposeRepository).toHaveBeenCalledOnce()
    expect(mocks.generateAudio).toHaveBeenCalledOnce()
    expect(events.playDialogue).not.toHaveBeenCalled()
    expect(vi.getTimerCount()).toBe(0)
  } finally {
    generation.resolve(createAudio())
    await flushPromises()
    view.cleanup()
  }
})

it('should retain the existing generation policy when the memo is edited without deletion', async () => {
  const generation = Promise.withResolvers<GenerateCompressedDialogueAudioResult>()
  mocks.generateAudio.mockReturnValueOnce(generation.promise)
  const {events, view} = renderReminders()

  try {
    await vi.advanceTimersToNextTimerAsync()
    setMemos((memos) =>
      memos.map((memo) =>
        memo.id === 'memo-1'
          ? {...memo, text: 'edited', updatedAt: '2026-09-04T03:00:01.000Z'}
          : memo,
      ),
    )
    await flushPromises()
    expect(mocks.cancelGeneration).not.toHaveBeenCalled()

    generation.resolve(createAudio())
    await flushPromises()
    expect(mocks.deleteDialogue).toHaveBeenCalledOnce()
    expect(events.playDialogue).not.toHaveBeenCalled()
  } finally {
    generation.resolve(createAudio())
    await flushPromises()
    view.cleanup()
  }
})

it('should not cancel generation when deletion happens during existing dialogue playback', async () => {
  setMemos((memos) => memos.map((memo) => ({...memo, dialogueId: memo.id})))
  const playback = Promise.withResolvers<boolean>()
  const {events, view} = renderReminders()
  vi.mocked(events.playDialogue).mockReturnValueOnce(playback.promise)

  try {
    await vi.advanceTimersToNextTimerAsync()
    expect(events.playDialogue).toHaveBeenCalledWith('memo-1')
    setMemos((memos) => memos.filter((memo) => memo.id !== 'memo-1'))
    await flushPromises()
    expect(mocks.cancelGeneration).not.toHaveBeenCalled()
    expect(mocks.generateAudio).not.toHaveBeenCalled()

    playback.resolve(true)
    await flushPromises()
    await vi.advanceTimersToNextTimerAsync()
    await flushPromises()
    expect(events.playDialogue).toHaveBeenLastCalledWith('memo-2')
    expect(mocks.cancelGeneration).not.toHaveBeenCalled()
  } finally {
    playback.resolve(true)
    await flushPromises()
    view.cleanup()
  }
})

it('should resume the serial pipeline only after the real client receives a cancellation result', async () => {
  const worker = Object.assign(new EventTarget(), {postMessage: vi.fn(), terminate: vi.fn()})
  const WorkerMock = vi.fn(function WorkerMock() {
    return worker
  })
  vi.stubGlobal('Worker', WorkerMock)
  const emit = (message: SupertonicWorkerOutput) =>
    worker.dispatchEvent(new MessageEvent('message', {data: message}))
  mocks.createClient.mockImplementation(createSupertonicClient)
  mocks.generateAudio.mockImplementation(generateCompressedDialogueAudio)
  const {events, view} = renderReminders()

  try {
    await vi.advanceTimersToNextTimerAsync()
    expect(worker.postMessage).toHaveBeenCalledWith({modelId: 'int8', type: 'initialize'})
    emit({backend: 'wasm', type: 'ready'})
    await flushPromises()
    expect(worker.postMessage).toHaveBeenLastCalledWith(
      expect.objectContaining({requestId: 1, text: 'memo-1', type: 'generate'}),
    )

    setMemos((memos) => memos.filter((memo) => memo.id !== 'memo-1'))
    await flushPromises()
    expect(worker.postMessage).toHaveBeenLastCalledWith({type: 'cancel-generation'})
    expect(mocks.generateAudio).toHaveBeenCalledOnce()
    expect(worker.terminate).not.toHaveBeenCalled()

    emit({
      error: {code: 'cancelled', phase: 'generate', retryable: false},
      requestId: 1,
      type: 'error',
    })
    await flushPromises()
    await vi.advanceTimersToNextTimerAsync()
    await flushPromises()
    expect(worker.postMessage).toHaveBeenLastCalledWith(
      expect.objectContaining({requestId: 2, text: 'memo-2', type: 'generate'}),
    )
    const audio = {
      generationTime: 1,
      requestId: 2,
      sampleRate: 24_000,
      samples: new Float32Array(240),
    }
    emit({...audio, index: 0, total: 1, type: 'chunk'})
    emit({...audio, type: 'result'})
    await flushPromises()

    expect(mocks.saveDialogue).toHaveBeenCalledOnce()
    expect(mocks.saveDialogue).toHaveBeenCalledWith(
      expect.objectContaining({
        dialogue: expect.objectContaining({text: 'memo-2'}),
      }),
    )
    expect(events.playDialogue).toHaveBeenCalledOnce()
    expect(WorkerMock).toHaveBeenCalledOnce()
    expect(worker.terminate).not.toHaveBeenCalled()
  } finally {
    view.cleanup()
    emit({type: 'disposed'})
  }
})
