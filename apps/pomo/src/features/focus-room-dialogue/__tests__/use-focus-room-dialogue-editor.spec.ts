// oxlint-disable require-yield -- Rejection coverage needs an async generator that fails before its first value.
import {createRoot} from 'solid-js'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {type CreateOpusBlobOptions, successResult, type SupertonicClient} from '../../supertonic'
import {
  type TextMoodAnalysis,
  type TextMoodAnalyzer,
  type TextMoodRuntime,
  textMoodSuccess,
} from '../../text-mood'
import type {PDialogue} from '../schema'
import {type PDialogueEditorController, usePDialogueEditor} from '../use-focus-room-dialogue-editor'

const supertonicMocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  createOpusBlob: vi.fn(),
}))
const repositoryMocks = vi.hoisted(() => ({
  dispose: vi.fn(),
  getAudio: vi.fn(),
  getDialogue: vi.fn(),
  saveDialogue: vi.fn(async () => undefined),
}))
const moodAnalyzerMocks = {
  analyze: vi.fn<TextMoodAnalyzer['analyze']>(),
  dispose: vi.fn(),
  prepare: vi.fn<TextMoodAnalyzer['prepare']>(),
}
const moodRuntime: TextMoodRuntime = {createAnalyzer: vi.fn(() => moodAnalyzerMocks)}
const NativeUrl = globalThis.URL

const cheerfulAnalysis: TextMoodAnalysis = {
  margin: 0.6,
  modifiers: [],
  primary: {id: 'cheerful', probability: 0.8},
  scores: [
    {id: 'cheerful', probability: 0.8},
    {id: 'hopeful', probability: 0.2},
  ],
  secondary: {id: 'hopeful', probability: 0.2},
  uncertain: false,
}

vi.mock('../../supertonic', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../supertonic')>()
  return {
    ...actual,
    createOpusBlob: supertonicMocks.createOpusBlob,
    createSupertonicClient: supertonicMocks.createClient,
  }
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
  generate: vi.fn(async () => successResult(createAudio())),
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
    return usePDialogueEditor({dialogueId: () => dialogueId, moodRuntime})
  })

  return {controller, dispose: disposeRoot}
}

beforeEach(() => {
  vi.clearAllMocks()
  supertonicMocks.createOpusBlob.mockResolvedValue(
    new Blob(['opus'], {type: 'audio/ogg; codecs=opus'}),
  )
  moodAnalyzerMocks.analyze.mockResolvedValue(
    textMoodSuccess({
      elapsedMilliseconds: 1,
      status: 'insufficient',
      sufficiency: {insufficient: true, probability: 0.8, threshold: 0.5},
    }),
  )
  sessionStorage.clear()
  vi.stubGlobal(
    'URL',
    class extends NativeUrl {
      static createObjectURL = vi.fn(() => 'blob:dialogue')
      static revokeObjectURL = vi.fn()
    },
  )
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

    expect(editor.controller.language()).toBe('ko')
    expect(editor.controller.modelId()).toBe('full')
    expect(editor.controller.canGenerate()).toBe(false)

    editor.controller.setText('자동 준비 후 바로 생성하는 대사')
    editor.controller.setLanguage('na')
    expect(editor.controller.canGenerate()).toBe(true)

    await editor.controller.generate()
    expect(calls).toEqual(['prepare', 'generate'])
    expect(client.initialize).toHaveBeenCalledWith(expect.objectContaining({modelId: 'full'}))
    expect(client.generateStream).toHaveBeenCalledWith({
      language: 'na',
      speed: 1.05,
      text: '자동 준비 후 바로 생성하는 대사',
      voice: {id: 'Yuna', kind: 'preset'},
    })

    await editor.controller.generate()
    expect(calls).toEqual(['prepare', 'generate', 'generate'])
    expect(client.initialize).toHaveBeenCalledTimes(1)

    expect(sessionStorage.getItem('pomo:focus-room-dialogue:draft:new')).not.toBeNull()
    await editor.controller.save()
    expect(repositoryMocks.saveDialogue).toHaveBeenCalledTimes(1)
    expect(repositoryMocks.saveDialogue).toHaveBeenCalledWith(
      expect.objectContaining({dialogue: expect.objectContaining({language: 'na'})}),
    )
    expect(sessionStorage.getItem('pomo:focus-room-dialogue:draft:new')).toBeNull()

    editor.dispose()
  })

  it('should regenerate one segment only after generating editable audio and encode Opus on save', async () => {
    const client = createClient([])
    const sourceText = '첫 번째 문장은 충분히 길어요.\n\n두 번째 문장도 충분히 길어요.'
    vi.mocked(client.generateStream).mockImplementationOnce(async function* generateStream() {
      yield successResult({
        audio: {
          generationTime: 1,
          index: 0,
          sampleRate: 10,
          samples: Float32Array.of(0.1, 0.2),
          total: 2,
        },
        type: 'chunk' as const,
      })
      yield successResult({
        audio: {
          generationTime: 1,
          index: 1,
          sampleRate: 10,
          samples: Float32Array.of(0.3, 0.4),
          total: 2,
        },
        type: 'chunk' as const,
      })
      yield successResult({
        audio: {generationTime: 2, sampleRate: 10, samples: new Float32Array(7)},
        type: 'complete' as const,
      })
    })
    vi.mocked(client.generate).mockResolvedValueOnce(
      successResult({generationTime: 1, sampleRate: 10, samples: new Float32Array(4)}),
    )
    supertonicMocks.createClient.mockReturnValue(client)
    const editor = createEditorRoot()

    editor.controller.setText(sourceText)
    expect(editor.controller.canRegenerateSegments()).toBe(false)

    await editor.controller.generate()

    expect(editor.controller.canRegenerateSegments()).toBe(true)
    expect(supertonicMocks.createOpusBlob).not.toHaveBeenCalled()

    await editor.controller.regenerateSegment(0)

    expect(client.generate).toHaveBeenCalledWith({
      language: 'ko',
      speed: 1.05,
      text: '첫 번째 문장은 충분히 길어요.',
      voice: {id: 'Yuna', kind: 'preset'},
    })
    expect(editor.controller.durationMs()).toBe(900)
    expect(editor.controller.segments()[1]).toEqual(
      expect.objectContaining({durationMs: 200, startMs: 700}),
    )
    expect(supertonicMocks.createOpusBlob).not.toHaveBeenCalled()

    await editor.controller.save()

    expect(supertonicMocks.createOpusBlob).toHaveBeenCalledWith({
      sampleRate: 10,
      samples: expect.any(Float32Array),
      signal: expect.any(AbortSignal),
    })
    expect(supertonicMocks.createOpusBlob.mock.calls[0]?.[0].samples).toHaveLength(9)
    editor.dispose()
  })

  it('should cancel pending Opus encoding when the editor is disposed', async () => {
    const client = createClient([])
    supertonicMocks.createClient.mockReturnValue(client)
    supertonicMocks.createOpusBlob.mockImplementationOnce(
      (options: CreateOpusBlobOptions) =>
        new Promise((_resolve, reject) => {
          options.signal?.addEventListener('abort', () => reject(options.signal?.reason), {
            once: true,
          })
        }),
    )
    const editor = createEditorRoot()
    editor.controller.setText('저장 중 화면을 나가는 대사')
    await editor.controller.generate()

    const saving = editor.controller.save()
    await vi.waitFor(() => expect(supertonicMocks.createOpusBlob).toHaveBeenCalledOnce())
    editor.dispose()

    await expect(saving).resolves.toBeNull()
    expect(repositoryMocks.saveDialogue).not.toHaveBeenCalled()
  })

  it('should save complete mood analysis with the generated segment', async () => {
    const client = createClient([])
    supertonicMocks.createClient.mockReturnValue(client)
    moodAnalyzerMocks.analyze.mockResolvedValueOnce(
      textMoodSuccess({analysis: cheerfulAnalysis, elapsedMilliseconds: 12, status: 'complete'}),
    )
    const editor = createEditorRoot()
    editor.controller.setText('오늘은 정말 신나는 날이야!')

    await editor.controller.generate()
    await editor.controller.save()

    expect(editor.controller.segments()[0].mood).toEqual(cheerfulAnalysis)
    expect(repositoryMocks.saveDialogue).toHaveBeenCalledWith(
      expect.objectContaining({
        dialogue: expect.objectContaining({
          segments: [expect.objectContaining({mood: cheerfulAnalysis})],
        }),
      }),
    )
    editor.dispose()
  })

  it('should invalidate generated audio and status when the language changes', async () => {
    const client = createClient([])
    supertonicMocks.createClient.mockReturnValue(client)
    const editor = createEditorRoot()
    editor.controller.setText('언어 변경 전 대사')
    await editor.controller.generate()

    expect(editor.controller.canSave()).toBe(true)
    expect(editor.controller.canRegenerateSegments()).toBe(true)
    expect(editor.controller.state().status).toBe('ready')

    editor.controller.setLanguage('en')

    expect(editor.controller.audioUrl()).toBeNull()
    expect(editor.controller.canSave()).toBe(false)
    expect(editor.controller.canRegenerateSegments()).toBe(false)
    expect(editor.controller.segments()).toEqual([])
    expect(editor.controller.state()).toEqual({
      message: '선택한 언어로 음성을 만들어 주세요.',
      status: 'idle',
    })

    await editor.controller.generate()
    expect(client.initialize).toHaveBeenCalledTimes(1)
    expect(client.generateStream).toHaveBeenLastCalledWith(
      expect.objectContaining({language: 'en'}),
    )
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

  it('should keep segment regeneration disabled for loaded compressed audio', async () => {
    repositoryMocks.getDialogue.mockResolvedValueOnce({
      audioKey: 'stored-audio',
      createdAt: '2026-08-13T00:00:00.000Z',
      durationMs: 1000,
      id: 'stored-dialogue',
      language: 'ko',
      modelId: 'full',
      segments: [{durationMs: 1000, index: 0, startMs: 0, text: '저장된 대사'}],
      text: '저장된 대사',
      updatedAt: '2026-08-13T00:00:00.000Z',
      version: 1,
      voiceId: 'Yuna',
    } satisfies PDialogue)
    repositoryMocks.getAudio.mockResolvedValueOnce(
      new Blob(['stored'], {type: 'audio/ogg; codecs=opus'}),
    )
    const editor = createEditorRoot('stored-dialogue')

    await vi.waitFor(() => expect(editor.controller.state().status).toBe('idle'))

    expect(editor.controller.canSave()).toBe(true)
    expect(editor.controller.segments()).toHaveLength(1)
    expect(editor.controller.canRegenerateSegments()).toBe(false)
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
      language: 'ko',
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
