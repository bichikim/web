// oxlint-disable require-yield -- Rejection coverage needs an async generator that fails before its first value.
import {createRoot} from 'solid-js'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {successResult, type SupertonicClient} from '../../supertonic'
import type {PDialogue} from '../schema'
import {type PDialogueEditorController, usePDialogueEditor} from '../use-focus-room-dialogue-editor'

const supertonicMocks = vi.hoisted(() => ({createClient: vi.fn()}))
const repositoryMocks = vi.hoisted(() => ({
  dispose: vi.fn(),
  getAudio: vi.fn(),
  getDialogue: vi.fn(),
  saveDialogue: vi.fn(async () => undefined),
}))

vi.mock('../../supertonic', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../supertonic')>()
  return {...actual, createSupertonicClient: supertonicMocks.createClient}
})

vi.mock('../repository', () => ({
  createPDialogueRepository: () => repositoryMocks,
}))

interface DialogueEditorTestRoot {
  readonly controller: PDialogueEditorController
  readonly dispose: () => void
}

const createAudio = () => ({
  generationTime: 1,
  sampleRate: 24_000,
  samples: Float32Array.of(0),
})

const createClient = (calls: Array<string>): SupertonicClient => ({
  cancelGeneration: vi.fn(),
  dispose: vi.fn(),
  generate: vi.fn(),
  generateStream: vi.fn(async function* generateStream() {
    calls.push('generate')
    yield successResult({
      audio: {...createAudio(), index: 0, total: 1},
      type: 'chunk' as const,
    })
    yield successResult({audio: createAudio(), type: 'complete' as const})
  }),
  initialize: vi.fn(async () => {
    calls.push('prepare')
    return successResult(undefined)
  }),
})

const createEditorRoot = (dialogueId: string | null = null): DialogueEditorTestRoot => {
  let disposeRoot: () => void = () => undefined
  const controller = createRoot((dispose) => {
    disposeRoot = dispose
    return usePDialogueEditor({dialogueId: () => dialogueId})
  })

  return {controller, dispose: disposeRoot}
}

beforeEach(() => {
  vi.clearAllMocks()
  sessionStorage.clear()
  vi.stubGlobal('URL', {
    createObjectURL: vi.fn(() => 'blob:dialogue'),
    revokeObjectURL: vi.fn(),
  })
  vi.stubGlobal('crypto', {randomUUID: vi.fn(() => 'dialogue-id')})
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('usePDialogueEditor', () => {
  it('should restore and update the new-dialogue draft for the current tab', async () => {
    const draftKey = 'pomo:focus-room-dialogue:draft:new'
    sessionStorage.setItem(draftKey, '새로고침 전에 작성한 대사')
    const editor = createEditorRoot()

    await Promise.resolve()
    expect(editor.controller.text()).toBe('새로고침 전에 작성한 대사')

    editor.controller.setText('계속 작성한 대사')
    expect(sessionStorage.getItem(draftKey)).toBe('계속 작성한 대사')

    editor.dispose()
  })

  it('should prepare an unprepared model before generating and reuse it afterward', async () => {
    const calls: Array<string> = []
    const client = createClient(calls)
    supertonicMocks.createClient.mockReturnValue(client)
    const editor = createEditorRoot()

    expect(editor.controller.modelId()).toBe('full')
    expect(editor.controller.canGenerate()).toBe(false)

    editor.controller.setText('자동 준비 후 바로 생성하는 대사')
    expect(editor.controller.canGenerate()).toBe(true)

    await editor.controller.generate()
    expect(calls).toEqual(['prepare', 'generate'])
    expect(client.initialize).toHaveBeenCalledWith(expect.objectContaining({modelId: 'full'}))

    await editor.controller.generate()
    expect(calls).toEqual(['prepare', 'generate', 'generate'])
    expect(client.initialize).toHaveBeenCalledTimes(1)

    expect(sessionStorage.getItem('pomo:focus-room-dialogue:draft:new')).not.toBeNull()
    await editor.controller.save()
    expect(repositoryMocks.saveDialogue).toHaveBeenCalledTimes(1)
    expect(sessionStorage.getItem('pomo:focus-room-dialogue:draft:new')).toBeNull()

    editor.dispose()
  })

  it('should recover when model preparation rejects unexpectedly', async () => {
    const client = createClient([])
    vi.mocked(client.initialize).mockRejectedValueOnce(new Error('worker failed'))
    supertonicMocks.createClient.mockReturnValue(client)
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const editor = createEditorRoot()
    editor.controller.setText('다시 시도할 수 있어야 하는 대사')

    await editor.controller.generate()

    expect(editor.controller.state()).toEqual({
      message: '음성 모델을 준비하지 못했어요.',
      status: 'error',
    })
    expect(editor.controller.canGenerate()).toBe(true)
    expect(errorSpy).toHaveBeenCalledOnce()
    editor.dispose()
  })

  it('should recover when the model worker cannot start', async () => {
    supertonicMocks.createClient.mockImplementationOnce(() => {
      throw new Error('worker blocked')
    })
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const editor = createEditorRoot()
    editor.controller.setText('Worker를 다시 시작할 수 있어야 하는 대사')

    await editor.controller.generate()

    expect(editor.controller.state()).toEqual({
      message: '음성 모델을 시작하지 못했어요.',
      status: 'error',
    })
    expect(editor.controller.canGenerate()).toBe(true)
    expect(errorSpy).toHaveBeenCalledOnce()
    editor.dispose()
  })

  it('should recover when voice generation rejects unexpectedly', async () => {
    const client = createClient([])
    vi.mocked(client.generateStream).mockImplementationOnce(async function* rejectedGeneration() {
      throw new Error('generation failed')
    })
    supertonicMocks.createClient.mockReturnValue(client)
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const editor = createEditorRoot()
    editor.controller.setText('생성 실패 후 다시 시도하는 대사')

    await editor.controller.generate()

    expect(editor.controller.state()).toEqual({message: '음성을 만들지 못했어요.', status: 'error'})
    expect(editor.controller.canGenerate()).toBe(true)
    expect(errorSpy).toHaveBeenCalledOnce()
    editor.dispose()
  })

  it('should preserve the generating state when the worker reports progress', async () => {
    const client = createClient([])
    let reportStatus: (message: string) => void = () => undefined
    vi.mocked(client.initialize).mockImplementationOnce(async (options) => {
      reportStatus = options.onStatus
      return successResult(undefined)
    })
    supertonicMocks.createClient.mockReturnValue(client)
    const editor = createEditorRoot()
    let statusDuringGeneration = ''
    vi.mocked(client.generateStream).mockImplementationOnce(async function* generateStream() {
      reportStatus('음성을 다듬고 있어요.')
      statusDuringGeneration = editor.controller.state().status
      yield successResult({
        audio: {...createAudio(), index: 0, total: 1},
        type: 'chunk' as const,
      })
      yield successResult({audio: createAudio(), type: 'complete' as const})
    })
    editor.controller.setText('진행 상태를 유지하는 대사')

    await editor.controller.generate()

    expect(statusDuringGeneration).toBe('generating')
    expect(editor.controller.state().status).toBe('ready')
    editor.dispose()
  })

  it('should ignore a dialogue load that finishes after disposal', async () => {
    let resolveDialogue: (dialogue: PDialogue) => void = () => undefined
    const dialogueLoad = new Promise<PDialogue>((resolve) => {
      resolveDialogue = resolve
    })
    repositoryMocks.getDialogue.mockReturnValue(dialogueLoad)
    const editor = createEditorRoot('stored-dialogue')
    await Promise.resolve()
    editor.dispose()

    resolveDialogue({
      audioKey: 'stored-audio',
      createdAt: '2026-08-13T00:00:00.000Z',
      durationMs: 1000,
      id: 'stored-dialogue',
      modelId: 'full',
      segments: [{durationMs: 1000, index: 0, startMs: 0, text: '저장된 대사'}],
      text: '저장된 대사',
      updatedAt: '2026-08-13T00:00:00.000Z',
      version: 1,
      voiceId: 'Yuna',
    })
    await Promise.resolve()
    await Promise.resolve()

    expect(repositoryMocks.getAudio).not.toHaveBeenCalled()
    expect(URL.createObjectURL).not.toHaveBeenCalled()
    expect(repositoryMocks.dispose).toHaveBeenCalledOnce()
  })
})
