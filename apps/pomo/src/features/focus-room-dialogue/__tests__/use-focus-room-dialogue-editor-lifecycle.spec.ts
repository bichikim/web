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
  it('should ignore a direct generation request with empty text', async () => {
    const client = createClient([])
    supertonicMocks.createClient.mockReturnValue(client)
    const editor = createEditorRoot()

    await editor.controller.generate()

    expect(client.initialize).not.toHaveBeenCalled()
    expect(client.generateStream).not.toHaveBeenCalled()
    editor.dispose()
  })

  it('should report an unexpected initial dialogue loading rejection', async () => {
    const error = new Error('load failed')
    sessionStorage.setItem('pomo:focus-room-dialogue:draft:failed-dialogue', 'changed draft')
    repositoryMocks.getDialogue.mockResolvedValueOnce(createStoredDialogue('failed-dialogue'))
    repositoryMocks.getAudio.mockResolvedValueOnce(new Blob(['audio']))
    vi.mocked(URL.revokeObjectURL).mockImplementationOnce(() => {
      throw error
    })
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const editor = createEditorRoot('failed-dialogue')

    await vi.waitFor(() =>
      expect(errorSpy).toHaveBeenCalledWith('Unexpected dialogue loading failure.', error),
    )

    editor.dispose()
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
