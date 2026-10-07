/** @vitest-environment node */
import {expect, it, vi} from 'vitest'
import {successResult} from 'src/features/result'
import type {SupertonicAudioChunk, SupertonicClient} from '../../supertonic'
import {getSupertonicModel} from '../../supertonic/model'
import {splitReferenceSpeechText} from '../../supertonic/__tests__/fixtures/text-chunking'
import {generateDialogueAudio} from '../generate-dialogue-audio'

it('should align original Unicode text chunks with streamed dialogue audio and subtitle offsets', async () => {
  const policy = getSupertonicModel('full').speechPolicy
  const text = `${'😀'.repeat(220)}\r\n짧은 줄\n\n${'e\u0301'.repeat(160)}`
  const expected = splitReferenceSpeechText(text, policy)
  const samples = new Float32Array(10)
  const audioChunks: ReadonlyArray<SupertonicAudioChunk> = expected.map((_, index) => ({
    generationTime: 0,
    index,
    sampleRate: 1000,
    samples,
    total: expected.length,
  }))
  const client: SupertonicClient = {
    cancelGeneration: vi.fn(),
    dispose: vi.fn(),
    generate: vi.fn(),
    generateStream: vi.fn(async function* generateStream() {
      for (const audio of audioChunks) {
        yield successResult({audio, type: 'chunk' as const})
      }
      yield successResult({
        audio: {generationTime: 0, sampleRate: 1000, samples},
        type: 'complete' as const,
      })
    }),
    initialize: vi.fn(),
  }
  const onChunk = vi.fn()

  const result = await generateDialogueAudio({
    client,
    language: 'ko',
    modelId: 'full',
    onChunk,
    text,
    voiceId: 'Yuna',
  })

  expect(result.ok).toBe(true)
  if (!result.ok) {
    throw new Error(result.message)
  }
  expect(result.value.segments.map((segment) => segment.text)).toEqual(expected)
  expect(result.value.segments.map((segment) => segment.startMs)).toEqual(
    expected.map((_, index) => index * (10 + policy.silenceDuration * 1000)),
  )
  expect(result.value.durationMs).toBeCloseTo(
    expected.length * 10 + (expected.length - 1) * policy.silenceDuration * 1000,
  )
  expect(onChunk).toHaveBeenCalledTimes(expected.length)
  expect(onChunk).toHaveBeenLastCalledWith(expected.length, expected.length)
})
