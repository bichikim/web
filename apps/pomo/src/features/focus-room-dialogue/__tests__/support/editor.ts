// oxlint-disable require-yield -- Rejection coverage needs an async generator that fails before its first value.
import {createRoot, createSignal} from 'solid-js'
import {afterEach, beforeEach, vi} from 'vitest'

import {successResult} from 'src/features/result'
import {type SupertonicClient} from '../../../supertonic'
import {
  type TextMoodAnalysis,
  type TextMoodAnalyzer,
  type TextMoodRuntime,
} from '../../../text-mood'
import type {PDialogue} from '../../schema'
import {
  type PDialogueEditorController,
  usePDialogueEditor,
} from '../../use-focus-room-dialogue-editor'

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
export const moodAnalyzerMocks = {
  analyze: vi.fn<TextMoodAnalyzer['analyze']>(),
  dispose: vi.fn(),
  prepare: vi.fn<TextMoodAnalyzer['prepare']>(),
}
export const moodRuntime: TextMoodRuntime = {createAnalyzer: vi.fn(() => moodAnalyzerMocks)}
const NativeUrl = globalThis.URL

export const cheerfulAnalysis: TextMoodAnalysis = {
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

vi.mock('../../../supertonic', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../supertonic')>()
  return {
    ...actual,
    createOpusBlob: supertonicMocks.createOpusBlob,
    createSupertonicClient: supertonicMocks.createClient,
  }
})

vi.mock('../../repository', () => ({
  createPDialogueRepository: () => repositoryMocks,
}))

interface DialogueEditorTestRoot {
  readonly controller: PDialogueEditorController
  readonly dispose: () => void
  readonly navigate: (id: string | null) => void
}

export const createAudio = () => ({
  generationTime: 1,
  sampleRate: 24_000,
  samples: Float32Array.of(0),
})

export const createStoredDialogue = (id = 'stored-dialogue', text = '저장된 대사'): PDialogue => ({
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

export const createClient = (calls: Array<string>): SupertonicClient => ({
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

export const createEditorRoot = (dialogueId: string | null = null): DialogueEditorTestRoot => {
  const [selectedId, navigate] = createSignal(dialogueId)
  return createRoot((dispose) => ({
    controller: usePDialogueEditor({dialogueId: selectedId, moodRuntime}),
    dispose,
    navigate,
  }))
}

export const createDefaultMoodEditorRoot = (): DialogueEditorTestRoot =>
  createRoot((dispose) => ({
    controller: usePDialogueEditor({dialogueId: () => null}),
    dispose,
    navigate: () => undefined,
  }))

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

export {supertonicMocks, repositoryMocks}
