// oxlint-disable require-yield -- Rejection coverage needs an async generator that fails before its first value.
import {createRoot} from 'solid-js'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {failureResult, successResult} from '../../result'
import {type CreateOpusBlobOptions, type SupertonicClient} from '../../supertonic'
import {type TextMoodAnalysis, type TextMoodAnalyzer, type TextMoodRuntime} from '../../text-mood'
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

const createStoredDialogue = (id = 'stored-dialogue', text = '저장된 대사'): PDialogue => ({
  audioKey: `${id}-audio`,
  createdAt: '2026-08-13T00:00:00.000Z',
  durationMs: 1000,
  id,
  language: 'ko',
  modelId: 'full',
  segments: [{durationMs: 1000, index: 0, startMs: 0, text}],
  text,
  updatedAt: '2026-08-13T00:00:00.000Z',
  version: 1,
  voiceId: 'Yuna',
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

const createDefaultMoodEditorRoot = (): DialogueEditorTestRoot => {
  let disposeRoot: () => void = () => undefined
  const controller = createRoot((dispose) => {
    disposeRoot = dispose
    return usePDialogueEditor({dialogueId: () => null})
  })

  return {controller, dispose: disposeRoot}
}

beforeEach(() => {
  vi.clearAllMocks()
  supertonicMocks.createOpusBlob.mockResolvedValue(
    new Blob(['opus'], {type: 'audio/ogg; codecs=opus'}),
  )
  moodAnalyzerMocks.analyze.mockResolvedValue(
    successResult({
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
      successResult({analysis: cheerfulAnalysis, elapsedMilliseconds: 12, status: 'complete'}),
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

  it('should guard unavailable actions, unchanged selections, and calls after disposal', async () => {
    const editor = createDefaultMoodEditorRoot()

    expect(editor.controller.progress()).toBe(0)
    await editor.controller.generate()
    await editor.controller.regenerateSegment(0)
    await expect(editor.controller.save()).resolves.toBeNull()

    editor.controller.setModelId('full')
    editor.controller.setVoiceId('Yuna')
    editor.controller.setLanguage('ko')
    expect(editor.controller.state().status).toBe('idle')

    editor.dispose()
    editor.controller.setText('이미 닫힌 편집기')
    expect(URL.createObjectURL).not.toHaveBeenCalled()
  })

  it('should report missing dialogue metadata and missing stored audio', async () => {
    repositoryMocks.getDialogue.mockResolvedValueOnce(null)
    const missingDialogue = createEditorRoot('missing-dialogue')

    await vi.waitFor(() => expect(missingDialogue.controller.state().status).toBe('error'))
    expect(missingDialogue.controller.state().message).toBe('저장된 대화를 찾을 수 없어요.')
    missingDialogue.dispose()

    repositoryMocks.getDialogue.mockResolvedValueOnce(createStoredDialogue())
    repositoryMocks.getAudio.mockResolvedValueOnce(null)
    const missingAudio = createEditorRoot('stored-dialogue')

    await vi.waitFor(() => expect(missingAudio.controller.state().status).toBe('error'))
    expect(missingAudio.controller.text()).toBe('저장된 대사')
    expect(missingAudio.controller.language()).toBe('ko')
    expect(missingAudio.controller.modelId()).toBe('full')
    expect(missingAudio.controller.voiceId()).toBe('Yuna')
    missingAudio.dispose()
  })

  it('should report an active load failure and ignore a failure after disposal', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    repositoryMocks.getDialogue.mockRejectedValueOnce(new Error('database unavailable'))
    const activeEditor = createEditorRoot('active-dialogue')

    await vi.waitFor(() => expect(activeEditor.controller.state().status).toBe('error'))
    expect(activeEditor.controller.state().message).toBe('대화를 불러오지 못했어요.')
    activeEditor.dispose()

    let rejectDialogue: (error: Error) => void = () => undefined
    repositoryMocks.getDialogue.mockReturnValueOnce(
      new Promise((_resolve, reject) => {
        rejectDialogue = reject
      }),
    )
    const disposedEditor = createEditorRoot('disposed-dialogue')
    await Promise.resolve()
    disposedEditor.dispose()
    rejectDialogue(new Error('late database failure'))
    await Promise.resolve()
    await Promise.resolve()

    expect(errorSpy).toHaveBeenCalledOnce()
  })

  it('should ignore stored audio that resolves after disposal', async () => {
    let resolveAudio: (audio: Blob) => void = () => undefined
    repositoryMocks.getDialogue.mockResolvedValueOnce(createStoredDialogue())
    repositoryMocks.getAudio.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveAudio = resolve
      }),
    )
    const editor = createEditorRoot('stored-dialogue')
    await vi.waitFor(() => expect(repositoryMocks.getAudio).toHaveBeenCalledOnce())
    editor.dispose()

    resolveAudio(new Blob(['late audio']))
    await Promise.resolve()
    await Promise.resolve()

    expect(URL.createObjectURL).not.toHaveBeenCalled()
  })

  it('should prefer a changed stored draft and retain matching generated audio', async () => {
    const draftKey = 'pomo:focus-room-dialogue:draft:changed-dialogue'
    sessionStorage.setItem(draftKey, '임시 저장한 새 대사')
    repositoryMocks.getDialogue.mockResolvedValueOnce(
      createStoredDialogue('changed-dialogue', '서버에 저장된 대사'),
    )
    repositoryMocks.getAudio.mockResolvedValueOnce(new Blob(['stored audio']))
    const changedDraft = createEditorRoot('changed-dialogue')

    await vi.waitFor(() => expect(changedDraft.controller.text()).toBe('임시 저장한 새 대사'))
    expect(changedDraft.controller.audioUrl()).toBeNull()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:dialogue')
    changedDraft.dispose()

    sessionStorage.setItem('pomo:focus-room-dialogue:draft:matching-dialogue', '동일한 저장 대사')
    repositoryMocks.getDialogue.mockResolvedValueOnce(
      createStoredDialogue('matching-dialogue', '동일한 저장 대사'),
    )
    repositoryMocks.getAudio.mockResolvedValueOnce(new Blob(['matching audio']))
    const matchingDraft = createEditorRoot('matching-dialogue')

    await vi.waitFor(() => expect(matchingDraft.controller.state().status).toBe('idle'))
    expect(matchingDraft.controller.audioUrl()).toBe('blob:dialogue')
    expect(matchingDraft.controller.canSave()).toBe(true)
    matchingDraft.dispose()
  })

  it('should expose capped model progress and an initialization failure message', async () => {
    const client = createClient([])
    let progressDuringPreparation = 0
    let statusDuringPreparation = ''
    vi.mocked(client.initialize).mockImplementationOnce(async (options) => {
      options.onProgress({fileName: 'voice-model.onnx', loadedBytes: 12, totalBytes: 10})
      progressDuringPreparation = editor.controller.progress()
      options.onStatus('모델 파일을 확인했어요.')
      statusDuringPreparation = editor.controller.state().message
      return failureResult({code: 'cancelled', phase: 'initialize', retryable: false})
    })
    supertonicMocks.createClient.mockReturnValue(client)
    const editor = createEditorRoot()
    editor.controller.setText('모델 준비 상태를 확인할 대사')

    await editor.controller.generate()

    expect(progressDuringPreparation).toBe(100)
    expect(statusDuringPreparation).toBe('모델 파일을 확인했어요.')
    expect(editor.controller.state().status).toBe('error')
    expect(editor.controller.progress()).toBe(0)
    editor.dispose()
  })

  it('should ignore stale model callbacks and successful initialization', async () => {
    const client = createClient([])
    vi.mocked(client.initialize).mockImplementationOnce(async (options) => {
      editor.controller.setModelId('int8')
      options.onProgress({fileName: 'stale.onnx', loadedBytes: 1, totalBytes: 2})
      options.onStatus('무시할 상태')
      return successResult(undefined)
    })
    supertonicMocks.createClient.mockReturnValue(client)
    const editor = createEditorRoot()
    editor.controller.setText('모델을 바꾸는 대사')

    await editor.controller.generate()

    expect(editor.controller.modelId()).toBe('int8')
    expect(editor.controller.state()).toEqual({
      message: '음성 만들기를 누르면 선택한 모델을 자동으로 준비해요.',
      status: 'idle',
    })
    expect(client.generateStream).not.toHaveBeenCalled()
    editor.dispose()
  })

  it('should ignore a stale initialization rejection after disposal', async () => {
    const client = createClient([])
    vi.mocked(client.initialize).mockImplementationOnce(async () => {
      editor.dispose()
      throw new Error('late initialization failure')
    })
    supertonicMocks.createClient.mockReturnValue(client)
    const editor = createEditorRoot()
    editor.controller.setText('닫히는 동안 준비하는 대사')

    await editor.controller.generate()

    expect(client.generateStream).not.toHaveBeenCalled()
  })

  it('should ignore generation chunks from a client invalidated during generation', async () => {
    const client = createClient([])
    vi.mocked(client.generateStream).mockImplementationOnce(async function* generateStream() {
      editor.controller.setModelId('int8')
      yield successResult({
        audio: {...createAudio(), index: 0, total: 1},
        type: 'chunk' as const,
      })
      yield successResult({audio: createAudio(), type: 'complete' as const})
    })
    supertonicMocks.createClient.mockReturnValue(client)
    const editor = createEditorRoot()
    editor.controller.setText('생성 중 모델을 바꾸는 대사')

    await editor.controller.generate()

    expect(editor.controller.audioUrl()).toBeNull()
    expect(editor.controller.modelId()).toBe('int8')
    expect(editor.controller.state().status).toBe('idle')
    editor.dispose()
  })

  it('should report a generated preview creation failure', async () => {
    const client = createClient([])
    supertonicMocks.createClient.mockReturnValue(client)
    vi.mocked(URL.createObjectURL).mockImplementationOnce(() => {
      throw new Error('blob URL unavailable')
    })
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const editor = createEditorRoot()
    editor.controller.setText('미리보기 생성에 실패하는 대사')

    await editor.controller.generate()

    expect(editor.controller.state()).toEqual({
      message: '생성된 음성을 준비하지 못했어요.',
      status: 'error',
    })
    expect(editor.controller.audioUrl()).toBeNull()
    expect(errorSpy).toHaveBeenCalledOnce()
    editor.dispose()
  })

  it('should report mood progress and preserve audio when one segment analysis fails', async () => {
    const client = createClient([])
    supertonicMocks.createClient.mockReturnValue(client)
    vi.mocked(moodRuntime.createAnalyzer).mockImplementationOnce((options) => {
      options.onProgress?.(42)
      return moodAnalyzerMocks
    })
    moodAnalyzerMocks.analyze.mockResolvedValueOnce(
      failureResult({code: 'classification-failed', phase: 'analyze', retryable: true}),
    )
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const editor = createEditorRoot()
    editor.controller.setText('감정 분석 실패를 허용하는 대사')

    await editor.controller.generate()

    expect(editor.controller.state().status).toBe('ready')
    expect(warnSpy).toHaveBeenCalledWith(
      'Failed to analyze dialogue segment 0.',
      expect.objectContaining({code: 'classification-failed'}),
    )
    editor.dispose()
  })

  it('should keep generated audio ready when the mood analyzer cannot start', async () => {
    const client = createClient([])
    supertonicMocks.createClient.mockReturnValue(client)
    vi.mocked(moodRuntime.createAnalyzer).mockImplementationOnce(() => {
      throw new Error('mood worker unavailable')
    })
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const editor = createEditorRoot()
    editor.controller.setText('감정 모델 없이 저장할 대사')

    await editor.controller.generate()

    expect(editor.controller.state()).toEqual({
      message: '음성은 만들었지만 일부 감정은 분석하지 못했어요.',
      status: 'ready',
    })
    expect(editor.controller.canSave()).toBe(true)
    expect(warnSpy).toHaveBeenCalledOnce()
    editor.dispose()
  })

  it('should ignore mood analysis completed for an invalidated client', async () => {
    const client = createClient([])
    const insufficient = successResult({
      elapsedMilliseconds: 1,
      status: 'insufficient' as const,
      sufficiency: {insufficient: true, probability: 0.8, threshold: 0.5},
    })
    let resolveAnalysis: (result: typeof insufficient) => void = () => undefined
    moodAnalyzerMocks.analyze.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveAnalysis = resolve
        }),
    )
    supertonicMocks.createClient.mockReturnValue(client)
    const editor = createEditorRoot()
    editor.controller.setText('분석 중 모델을 바꾸는 대사')

    const generating = editor.controller.generate()
    await vi.waitFor(() => expect(moodAnalyzerMocks.analyze).toHaveBeenCalledOnce())
    editor.controller.setModelId('int8')
    resolveAnalysis(insufficient)
    await generating

    expect(editor.controller.modelId()).toBe('int8')
    expect(editor.controller.segments()).toEqual([])
    editor.dispose()
  })

  it('should report segment regeneration failures and preview errors', async () => {
    const client = createClient([])
    supertonicMocks.createClient.mockReturnValue(client)
    const editor = createEditorRoot()
    editor.controller.setText('다시 만들 음성 구간')
    await editor.controller.generate()

    await editor.controller.regenerateSegment(99)
    expect(editor.controller.state()).toEqual({
      message: '다시 만들 말풍선을 찾지 못했어요.',
      status: 'error',
    })

    vi.mocked(URL.createObjectURL).mockImplementationOnce(() => {
      throw new Error('replacement URL unavailable')
    })
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    await editor.controller.regenerateSegment(0)

    expect(editor.controller.state()).toEqual({
      message: '다시 만든 음성을 준비하지 못했어요.',
      status: 'error',
    })
    expect(errorSpy).toHaveBeenCalledOnce()
    editor.dispose()
  })

  it('should ignore regeneration completed by an invalidated client', async () => {
    const client = createClient([])
    supertonicMocks.createClient.mockReturnValue(client)
    const editor = createEditorRoot()
    editor.controller.setText('재생성 중 모델을 바꿀 대사')
    await editor.controller.generate()
    vi.mocked(client.generate).mockImplementationOnce(async () => {
      editor.controller.setModelId('int8')
      return successResult(createAudio())
    })

    await editor.controller.regenerateSegment(0)

    expect(editor.controller.regeneratingSegmentIndex()).toBe(0)
    expect(editor.controller.modelId()).toBe('int8')
    editor.dispose()
  })

  it('should save loaded audio without re-encoding and preserve its identity', async () => {
    const dialogue = createStoredDialogue()
    repositoryMocks.getDialogue.mockResolvedValueOnce(dialogue)
    repositoryMocks.getAudio.mockResolvedValueOnce(new Blob(['stored audio']))
    const editor = createEditorRoot(dialogue.id)
    await vi.waitFor(() => expect(editor.controller.state().status).toBe('idle'))

    await expect(editor.controller.save()).resolves.toBe(dialogue.id)

    expect(supertonicMocks.createOpusBlob).not.toHaveBeenCalled()
    expect(repositoryMocks.saveDialogue).toHaveBeenCalledWith({
      audio: undefined,
      dialogue: expect.objectContaining({
        createdAt: dialogue.createdAt,
        id: dialogue.id,
      }),
    })
    editor.dispose()
  })

  it('should report an active save failure', async () => {
    const client = createClient([])
    supertonicMocks.createClient.mockReturnValue(client)
    repositoryMocks.saveDialogue.mockRejectedValueOnce(new Error('storage full'))
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const editor = createEditorRoot()
    editor.controller.setText('저장 실패를 보여 줄 대사')
    await editor.controller.generate()

    await expect(editor.controller.save()).resolves.toBeNull()

    expect(editor.controller.state()).toEqual({
      message: '대화를 저장하지 못했어요.',
      status: 'error',
    })
    expect(errorSpy).toHaveBeenCalledOnce()
    editor.dispose()
  })

  it('should ignore a save completed after disposal', async () => {
    const client = createClient([])
    let resolveSave: (value: undefined) => void = () => undefined
    supertonicMocks.createClient.mockReturnValue(client)
    repositoryMocks.saveDialogue.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveSave = resolve
      }),
    )
    const editor = createEditorRoot()
    editor.controller.setText('저장 중 닫히는 대사')
    await editor.controller.generate()

    const saving = editor.controller.save()
    await vi.waitFor(() => expect(repositoryMocks.saveDialogue).toHaveBeenCalledOnce())
    editor.dispose()
    resolveSave(undefined)

    await expect(saving).resolves.toBeNull()
  })

  it('should invalidate generated audio when voice or model selections change', async () => {
    const client = createClient([])
    supertonicMocks.createClient.mockReturnValue(client)
    const editor = createEditorRoot()
    editor.controller.setText('선택 변경 전에 만든 대사')
    await editor.controller.generate()
    expect(editor.controller.progress()).toBe(100)

    editor.controller.setVoiceId('M1')
    expect(editor.controller.voiceId()).toBe('M1')
    expect(editor.controller.state().message).toBe('선택한 목소리로 음성을 만들어 주세요.')

    editor.controller.setModelId('int8')
    expect(editor.controller.modelId()).toBe('int8')
    expect(client.dispose).toHaveBeenCalled()
    expect(editor.controller.state().message).toBe(
      '음성 만들기를 누르면 선택한 모델을 자동으로 준비해요.',
    )
    editor.dispose()
  })
})
