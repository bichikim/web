/** @vitest-environment jsdom */

import {afterEach, beforeEach, expect, it, type Mock, vi} from 'vitest'

import {generateCompressedDialogueAudio} from '../../../features/focus-room-dialogue'
import {
  createSupertonicClient,
  getSupertonicErrorMessage,
  type SupertonicClient,
} from '../../../features/supertonic'
import type {LanguageLearningCandidate} from '../candidate'
import {generateVoiceCandidates, regenerateCandidateVoice} from '../voice-generation'

vi.mock('../../../features/focus-room-dialogue', () => ({
  generateCompressedDialogueAudio: vi.fn(),
}))
vi.mock('../../../features/supertonic', () => ({
  createSupertonicClient: vi.fn(),
  getSupertonicErrorMessage: vi.fn(),
}))

const generatedAudio = () => ({
  ok: true as const,
  value: {audio: new Blob(['audio']), durationMs: 1000, segments: []},
})

const candidate = (): LanguageLearningCandidate => ({
  audio: new Blob(['old audio']),
  audioKey: 'audio-key',
  audioUrl: 'blob:old',
  durationMs: 500,
  id: 'candidate-id',
  modelId: 'int8',
  segments: [],
  selected: true,
  text: 'Sentence.',
  voiceId: 'Hana',
})

const createOptions = () => ({
  isDisposed: vi.fn(() => false),
  language: 'en' as const,
  modelId: 'full' as const,
  onProgress: vi.fn<(current: number, total: number) => void>(),
  onStatus: vi.fn<(message: string) => void>(),
  voiceId: 'Yuna' as const,
})

let disposeClient: Mock<SupertonicClient['dispose']>
let initializeClient: Mock<SupertonicClient['initialize']>

beforeEach(() => {
  disposeClient = vi.fn<SupertonicClient['dispose']>()
  initializeClient = vi.fn<SupertonicClient['initialize']>(async () => ({
    ok: true as const,
    value: undefined,
  }))
  vi.mocked(createSupertonicClient).mockReturnValue({
    cancelGeneration: vi.fn(),
    dispose: disposeClient,
    generate: vi.fn(),
    generateStream: vi.fn(),
    initialize: initializeClient,
  })
  vi.mocked(getSupertonicErrorMessage).mockReturnValue('voice initialization failed')
  vi.mocked(generateCompressedDialogueAudio).mockResolvedValue(generatedAudio())
  vi.spyOn(URL, 'createObjectURL').mockReturnValueOnce('blob:first').mockReturnValue('blob:next')
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)
  vi.spyOn(crypto, 'randomUUID')
    .mockReturnValueOnce('00000000-0000-4000-8000-000000000001')
    .mockReturnValueOnce('00000000-0000-4000-8000-000000000002')
    .mockReturnValueOnce('00000000-0000-4000-8000-000000000003')
    .mockReturnValueOnce('00000000-0000-4000-8000-000000000004')
})

afterEach(() => {
  vi.restoreAllMocks()
})

it('should generate every voice candidate and transfer their URL ownership', async () => {
  const options = createOptions()

  const result = await generateVoiceCandidates({
    ...options,
    sentences: ['First.', 'Second.'],
  })

  expect(result).toMatchObject({
    candidates: [
      {audioUrl: 'blob:first', modelId: 'full', text: 'First.', voiceId: 'Yuna'},
      {audioUrl: 'blob:next', modelId: 'full', text: 'Second.', voiceId: 'Yuna'},
    ],
    status: 'complete',
  })
  expect(result.status === 'complete' ? result.candidates[0]?.audioKey : null).toBe(
    '00000000-0000-4000-8000-000000000001',
  )
  expect(options.onProgress).toHaveBeenNthCalledWith(1, 1, 2)
  expect(options.onProgress).toHaveBeenNthCalledWith(2, 2, 2)
  expect(URL.revokeObjectURL).not.toHaveBeenCalled()
  expect(disposeClient).toHaveBeenCalledOnce()
})

it('should report expected initialization and audio failures', async () => {
  initializeClient.mockResolvedValueOnce({
    error: {code: 'cancelled', phase: 'initialize', retryable: false},
    ok: false,
  })

  await expect(
    generateVoiceCandidates({...createOptions(), sentences: ['Sentence.']}),
  ).resolves.toEqual({message: 'voice initialization failed', status: 'error'})

  vi.mocked(generateCompressedDialogueAudio).mockResolvedValueOnce({
    message: 'audio failed',
    ok: false,
  })
  await expect(
    generateVoiceCandidates({...createOptions(), sentences: ['Sentence.']}),
  ).resolves.toEqual({message: 'audio failed', status: 'error'})
})

it('should cancel disposed generation and revoke candidates it still owns', async () => {
  const disposedAfterInitialization = vi.fn(() => true)
  await expect(
    generateVoiceCandidates({
      ...createOptions(),
      isDisposed: disposedAfterInitialization,
      sentences: ['Sentence.'],
    }),
  ).resolves.toEqual({status: 'cancelled'})

  const disposedDuringGeneration = vi
    .fn<() => boolean>()
    .mockReturnValueOnce(false)
    .mockReturnValueOnce(false)
    .mockReturnValueOnce(true)
  await expect(
    generateVoiceCandidates({
      ...createOptions(),
      isDisposed: disposedDuringGeneration,
      sentences: ['First.', 'Second.'],
    }),
  ).resolves.toEqual({status: 'cancelled'})
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:first')
})

it('should normalize unexpected generation failures', async () => {
  vi.mocked(generateCompressedDialogueAudio).mockRejectedValueOnce(new Error('voice crashed'))

  await expect(
    generateVoiceCandidates({...createOptions(), sentences: ['Sentence.']}),
  ).resolves.toMatchObject({status: 'error'})
})

it('should regenerate one candidate with the selected voice configuration', async () => {
  const existingCandidate = candidate()

  const result = await regenerateCandidateVoice({
    ...createOptions(),
    candidate: existingCandidate,
  })

  expect(result).toMatchObject({
    candidate: {
      audioKey: existingCandidate.audioKey,
      audioUrl: 'blob:first',
      id: existingCandidate.id,
      modelId: 'full',
      voiceId: 'Yuna',
    },
    status: 'complete',
  })
  expect(disposeClient).toHaveBeenCalledOnce()
})

it('should report regeneration initialization and audio failures', async () => {
  initializeClient.mockResolvedValueOnce({
    error: {code: 'cancelled', phase: 'initialize', retryable: false},
    ok: false,
  })
  await expect(
    regenerateCandidateVoice({...createOptions(), candidate: candidate()}),
  ).resolves.toEqual({message: 'voice initialization failed', status: 'error'})

  vi.mocked(generateCompressedDialogueAudio).mockResolvedValueOnce({
    message: 'candidate audio failed',
    ok: false,
  })
  await expect(
    regenerateCandidateVoice({...createOptions(), candidate: candidate()}),
  ).resolves.toEqual({message: 'candidate audio failed', status: 'error'})
})

it('should cancel disposed regeneration before or after audio generation', async () => {
  await expect(
    regenerateCandidateVoice({
      ...createOptions(),
      candidate: candidate(),
      isDisposed: vi.fn(() => true),
    }),
  ).resolves.toEqual({status: 'cancelled'})

  await expect(
    regenerateCandidateVoice({
      ...createOptions(),
      candidate: candidate(),
      isDisposed: vi.fn<() => boolean>().mockReturnValueOnce(false).mockReturnValueOnce(true),
    }),
  ).resolves.toEqual({status: 'cancelled'})
})

it('should normalize unexpected regeneration failures', async () => {
  vi.mocked(generateCompressedDialogueAudio).mockRejectedValueOnce(new Error('voice crashed'))

  await expect(
    regenerateCandidateVoice({...createOptions(), candidate: candidate()}),
  ).resolves.toMatchObject({status: 'error'})
})
