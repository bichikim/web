import {beforeEach, describe, expect, it, vi} from 'vitest'

import {failureResult, successResult} from '../../result'
import type {SupertonicAudio, SupertonicAudioChunk, SupertonicClient} from '../../supertonic'
import type {DialogueSegment, DialogueSegmentMood} from '../schema'
import {
  createDialogueAudioPreview,
  createDialogueAudioSamples,
  generateCompressedDialogueAudio,
  type GeneratedDialogueAudio,
  generateDialogueAudio,
  regenerateDialogueSegmentAudio,
} from '../generate-dialogue-audio'

const audioMocks = vi.hoisted(() => ({joinAudioChunks: vi.fn()}))
const clientMocks = vi.hoisted(() => ({getSupertonicSpeechSpeed: vi.fn()}))
const errorMocks = vi.hoisted(() => ({getSupertonicErrorMessage: vi.fn()}))
const modelMocks = vi.hoisted(() => ({getSupertonicModel: vi.fn()}))
const opusMocks = vi.hoisted(() => ({createOpusBlob: vi.fn()}))
const textMocks = vi.hoisted(() => ({splitSpeechText: vi.fn()}))
const timelineMocks = vi.hoisted(() => ({createDialogueTimeline: vi.fn()}))
const waveMocks = vi.hoisted(() => ({createWaveBlob: vi.fn()}))

vi.mock('../../supertonic/audio', () => ({joinAudioChunks: audioMocks.joinAudioChunks}))
vi.mock('../../supertonic/client', () => ({
  getSupertonicSpeechSpeed: clientMocks.getSupertonicSpeechSpeed,
}))
vi.mock('../../supertonic/error-message', () => ({
  getSupertonicErrorMessage: errorMocks.getSupertonicErrorMessage,
}))
vi.mock('../../supertonic/model', () => ({getSupertonicModel: modelMocks.getSupertonicModel}))
vi.mock('../../supertonic/opus-client', () => ({createOpusBlob: opusMocks.createOpusBlob}))
vi.mock('../../supertonic/text-chunking', () => ({splitSpeechText: textMocks.splitSpeechText}))
vi.mock('../../supertonic/wav', () => ({createWaveBlob: waveMocks.createWaveBlob}))
vi.mock('../timeline', () => ({createDialogueTimeline: timelineMocks.createDialogueTimeline}))

const SAMPLE_RATE = 24_000
const JOINED_SAMPLES = Float32Array.of(0.1, 0.2, 0.3)
const FIRST_CHUNK: SupertonicAudioChunk = {
  generationTime: 10,
  index: 0,
  sampleRate: SAMPLE_RATE,
  samples: Float32Array.of(0.1, 0.2),
  total: 2,
}
const SECOND_CHUNK: SupertonicAudioChunk = {
  generationTime: 20,
  index: 1,
  sampleRate: SAMPLE_RATE,
  samples: Float32Array.of(0.3),
  total: 2,
}
const COMPLETE_AUDIO: SupertonicAudio = {
  generationTime: 30,
  sampleRate: SAMPLE_RATE,
  samples: JOINED_SAMPLES,
}
const MOOD: DialogueSegmentMood = {
  margin: 0.8,
  modifiers: [],
  primary: {id: 'cheerful', probability: 0.9},
  scores: [{id: 'cheerful', probability: 0.9}],
  secondary: null,
  uncertain: false,
}
const SEGMENTS: ReadonlyArray<DialogueSegment> = [
  {durationMs: 1000, index: 0, mood: MOOD, startMs: 0, text: '첫 문장'},
  {durationMs: 500, index: 1, startMs: 1300, text: '둘째 문장'},
]

const createClient = (): SupertonicClient => {
  const generate = vi
    .fn<SupertonicClient['generate']>()
    .mockResolvedValue(successResult(COMPLETE_AUDIO))
  const generateStream = vi.fn<SupertonicClient['generateStream']>()
  generateStream.mockImplementation(async function* streamDialogue() {
    yield successResult({audio: FIRST_CHUNK, type: 'chunk' as const})
    yield successResult({audio: SECOND_CHUNK, type: 'chunk' as const})
    yield successResult({audio: COMPLETE_AUDIO, type: 'complete' as const})
  })

  return {
    cancelGeneration: vi.fn(),
    dispose: vi.fn(),
    generate,
    generateStream,
    initialize: vi.fn(),
  }
}

const createOptions = (client: SupertonicClient) => ({
  client,
  language: 'ko' as const,
  modelId: 'full' as const,
  onChunk: vi.fn(),
  text: '첫 문장. 둘째 문장.',
  voiceId: 'Yuna' as const,
})

const createGeneratedAudio = (
  overrides: Partial<GeneratedDialogueAudio> = {},
): GeneratedDialogueAudio => ({
  audioChunks: [FIRST_CHUNK, SECOND_CHUNK],
  durationMs: 1800,
  sampleRate: SAMPLE_RATE,
  segments: SEGMENTS,
  speed: 0.8,
  ...overrides,
})

beforeEach(() => {
  vi.clearAllMocks()
  audioMocks.joinAudioChunks.mockReturnValue(JOINED_SAMPLES)
  clientMocks.getSupertonicSpeechSpeed.mockReturnValue(0.8)
  errorMocks.getSupertonicErrorMessage.mockReturnValue('음성 모델 오류')
  modelMocks.getSupertonicModel.mockReturnValue({speechPolicy: {silenceDuration: 0.3}})
  opusMocks.createOpusBlob.mockResolvedValue(new Blob(['opus'], {type: 'audio/ogg'}))
  textMocks.splitSpeechText.mockReturnValue(['첫 문장', '둘째 문장'])
  timelineMocks.createDialogueTimeline.mockReturnValue({durationMs: 1800, segments: SEGMENTS})
  waveMocks.createWaveBlob.mockReturnValue(new Blob(['wave'], {type: 'audio/wav'}))
})

describe('dialogue audio helpers', () => {
  it('should join editable PCM chunks with the selected model silence policy', () => {
    const audio = createGeneratedAudio()

    const samples = createDialogueAudioSamples(audio, 'full')

    expect(samples).toBe(JOINED_SAMPLES)
    expect(audioMocks.joinAudioChunks).toHaveBeenCalledWith({
      chunks: [FIRST_CHUNK.samples, SECOND_CHUNK.samples],
      sampleRate: SAMPLE_RATE,
      silenceDuration: 0.3,
    })
  })

  it('should encode joined PCM as a disposable wave preview', () => {
    const preview = createDialogueAudioPreview(createGeneratedAudio(), 'full')

    expect(preview.type).toBe('audio/wav')
    expect(waveMocks.createWaveBlob).toHaveBeenCalledWith(JOINED_SAMPLES, SAMPLE_RATE)
  })
})

describe('generateDialogueAudio', () => {
  it('should collect streamed chunks, report progress, and build the final timeline', async () => {
    const client = createClient()
    const options = createOptions(client)

    const result = await generateDialogueAudio(options)

    expect(result).toEqual({
      ok: true,
      value: createGeneratedAudio(),
    })
    expect(client.generateStream).toHaveBeenCalledWith({
      language: 'ko',
      speed: 0.8,
      text: options.text,
      voice: {id: 'Yuna', kind: 'preset'},
    })
    expect(options.onChunk).toHaveBeenNthCalledWith(1, 1, 2)
    expect(options.onChunk).toHaveBeenNthCalledWith(2, 2, 2)
    expect(timelineMocks.createDialogueTimeline).toHaveBeenCalledWith({
      audioChunks: [FIRST_CHUNK, SECOND_CHUNK],
      silenceDuration: 0.3,
      textChunks: ['첫 문장', '둘째 문장'],
    })
  })

  it('should return the Supertonic failure reported by the stream', async () => {
    const client = createClient()
    vi.mocked(client.generateStream).mockImplementationOnce(async function* failedStream() {
      yield failureResult({code: 'cancelled', phase: 'generate', retryable: false} as const)
    })

    await expect(generateDialogueAudio(createOptions(client))).resolves.toEqual({
      message: '음성 모델 오류',
      ok: false,
    })
  })

  it('should normalize unexpected stream failures', async () => {
    const client = createClient()
    const generationError = new Error('stream failed')
    vi.mocked(client.generateStream).mockImplementationOnce(async function* rejectedStream() {
      yield successResult({audio: FIRST_CHUNK, type: 'chunk' as const})
      throw generationError
    })
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    await expect(generateDialogueAudio(createOptions(client))).resolves.toEqual({
      message: '음성을 만들지 못했어요.',
      ok: false,
    })
    expect(consoleError).toHaveBeenCalledWith('Failed to generate dialogue audio.', generationError)
  })

  it('should report a stream that ends without complete audio', async () => {
    const client = createClient()
    vi.mocked(client.generateStream).mockImplementationOnce(async function* incompleteStream() {
      yield successResult({audio: FIRST_CHUNK, type: 'chunk' as const})
    })

    await expect(generateDialogueAudio(createOptions(client))).resolves.toEqual({
      message: '완성된 음성을 받지 못했어요.',
      ok: false,
    })
  })
})

describe('generateCompressedDialogueAudio', () => {
  it('should join and compress generated dialogue audio with its abort signal', async () => {
    const client = createClient()
    const signal = new AbortController().signal
    const options = {...createOptions(client), signal}

    const result = await generateCompressedDialogueAudio(options)

    expect(result).toEqual({
      ok: true,
      value: {
        audio: expect.objectContaining({type: 'audio/ogg'}),
        durationMs: 1800,
        segments: SEGMENTS,
      },
    })
    expect(opusMocks.createOpusBlob).toHaveBeenCalledWith({
      sampleRate: SAMPLE_RATE,
      samples: JOINED_SAMPLES,
      signal,
    })
  })

  it('should preserve a dialogue generation failure without attempting compression', async () => {
    const client = createClient()
    vi.mocked(client.generateStream).mockImplementationOnce(async function* failedStream() {
      yield failureResult({code: 'cancelled', phase: 'generate', retryable: false} as const)
    })

    await expect(generateCompressedDialogueAudio(createOptions(client))).resolves.toEqual({
      message: '음성 모델 오류',
      ok: false,
    })
    expect(opusMocks.createOpusBlob).not.toHaveBeenCalled()
  })

  it('should normalize an Opus encoding failure', async () => {
    const client = createClient()
    const encodingError = new Error('encode failed')
    opusMocks.createOpusBlob.mockRejectedValueOnce(encodingError)
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    await expect(generateCompressedDialogueAudio(createOptions(client))).resolves.toEqual({
      message: '음성을 만들지 못했어요.',
      ok: false,
    })
    expect(consoleError).toHaveBeenCalledWith('Failed to generate dialogue audio.', encodingError)
  })
})

describe('regenerateDialogueSegmentAudio', () => {
  it.each([
    {audioChunks: [FIRST_CHUNK], position: 1},
    {audioChunks: [FIRST_CHUNK, SECOND_CHUNK], position: 2},
  ])(
    'should reject missing segment audio at position $position',
    async ({audioChunks, position}) => {
      const client = createClient()

      await expect(
        regenerateDialogueSegmentAudio({
          client,
          current: createGeneratedAudio({audioChunks}),
          language: 'ko',
          modelId: 'full',
          position,
          voiceId: 'Yuna',
        }),
      ).resolves.toEqual({message: '다시 만들 말풍선을 찾지 못했어요.', ok: false})
      expect(client.generate).not.toHaveBeenCalled()
    },
  )

  it('should return the Supertonic failure for the selected segment', async () => {
    const client = createClient()
    vi.mocked(client.generate).mockResolvedValueOnce(
      failureResult({code: 'cancelled', phase: 'generate', retryable: false}),
    )

    await expect(
      regenerateDialogueSegmentAudio({
        client,
        current: createGeneratedAudio(),
        language: 'ko',
        modelId: 'full',
        position: 0,
        voiceId: 'Yuna',
      }),
    ).resolves.toEqual({message: '음성 모델 오류', ok: false})
  })

  it('should reject replacement audio with a different sample rate', async () => {
    const client = createClient()
    vi.mocked(client.generate).mockResolvedValueOnce(
      successResult({...COMPLETE_AUDIO, sampleRate: 16_000}),
    )

    await expect(
      regenerateDialogueSegmentAudio({
        client,
        current: createGeneratedAudio(),
        language: 'ko',
        modelId: 'full',
        position: 0,
        voiceId: 'Yuna',
      }),
    ).resolves.toEqual({message: '다시 만든 음성 형식이 기존 음성과 달라요.', ok: false})
  })

  it('should replace one chunk and preserve existing segment mood metadata', async () => {
    const client = createClient()
    const generatedAudio = {...COMPLETE_AUDIO, samples: Float32Array.of(0.9)}
    vi.mocked(client.generate).mockResolvedValueOnce(successResult(generatedAudio))

    const result = await regenerateDialogueSegmentAudio({
      client,
      current: createGeneratedAudio(),
      language: 'ko',
      modelId: 'full',
      position: 0,
      voiceId: 'Yuna',
    })

    expect(result).toEqual({
      ok: true,
      value: {
        audioChunks: [{...generatedAudio, index: 0, total: 2}, SECOND_CHUNK],
        durationMs: 1800,
        sampleRate: SAMPLE_RATE,
        segments: [SEGMENTS[0], SEGMENTS[1]],
        speed: 0.8,
      },
    })
    expect(client.generate).toHaveBeenCalledWith({
      language: 'ko',
      speed: 0.8,
      text: '첫 문장',
      voice: {id: 'Yuna', kind: 'preset'},
    })
    expect(timelineMocks.createDialogueTimeline).toHaveBeenCalledWith({
      audioChunks: [{...generatedAudio, index: 0, total: 2}, SECOND_CHUNK],
      silenceDuration: 0.3,
      textChunks: ['첫 문장', '둘째 문장'],
    })
  })

  it('should normalize unexpected segment generation failures', async () => {
    const client = createClient()
    const generationError = new Error('segment failed')
    vi.mocked(client.generate).mockRejectedValueOnce(generationError)
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    await expect(
      regenerateDialogueSegmentAudio({
        client,
        current: createGeneratedAudio(),
        language: 'ko',
        modelId: 'full',
        position: 0,
        voiceId: 'Yuna',
      }),
    ).resolves.toEqual({message: '음성을 만들지 못했어요.', ok: false})
    expect(consoleError).toHaveBeenCalledWith('Failed to generate dialogue audio.', generationError)
  })
})
