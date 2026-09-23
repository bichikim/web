/** @vitest-environment node */
import {describe, expect, it} from 'vitest'

import {
  parseAiJobInput,
  parseAiJobResult,
  runnerCapabilityFor,
  textJobInputSchema,
} from '../contracts'
import {createAiRunnerJobRequest} from '../runner-contract'

describe('AI job contracts', () => {
  it('validates text input and maps capability names for the runner', () => {
    const input = parseAiJobInput('text', {
      messages: [{content: '안녕하세요', role: 'user'}],
    })

    expect(input).toMatchObject({messages: [{content: '안녕하세요', role: 'user'}]})
    expect(runnerCapabilityFor('speech-to-text')).toBe('speech_to_text')
  })

  it('separates runner intermediates from the final temporary result namespace', () => {
    expect(
      createAiRunnerJobRequest({
        capability: 'image',
        input: {idea: 'rain'},
        jobId: '019d0000-0000-7000-8000-000000000001',
        modelId: 'image-model',
      }),
    ).toMatchObject({
      artifact: {
        intermediateObjectKeyPrefix: 'ai/intermediate/019d0000-0000-7000-8000-000000000001',
        objectKeyPrefix: 'ai/jobs/019d0000-0000-7000-8000-000000000001/temporary',
      },
    })
  })

  it('rejects an audio job without an input reference', () => {
    expect(() => parseAiJobInput('speech-to-text', {language: 'ko'})).toThrow()
    expect(() => parseAiJobInput('speech-to-text', {audioUrl: 'file:///tmp/input.wav'})).toThrow()
    expect(() => textJobInputSchema.parse({messages: []})).toThrow()
  })

  it('requires the runner result shape to match the requested capability', () => {
    expect(() =>
      parseAiJobResult('image', {
        artifact: {contentType: 'audio/wav', objectKey: 'ai/jobs/job-1/result.wav'},
      }),
    ).toThrow()
    expect(
      parseAiJobResult('text-to-speech', {
        artifact: {contentType: 'audio/wav', objectKey: 'ai/jobs/job-1/result.wav'},
      }),
    ).toMatchObject({artifact: {contentType: 'audio/wav'}})
  })

  it('bounds persisted text results to the short-result contract', () => {
    expect(() => parseAiJobResult('text', {text: 'x'.repeat(12_001)})).toThrow()
  })
})

it.each(['https://internal.example.test/secret', 'https://127.0.0.1/private'])(
  'should reject remote speech input before runner dispatch: %s',
  (audioUrl) => {
    expect(() => parseAiJobInput('speech-to-text', {audioUrl})).toThrow()
  },
)

it('should continue accepting bounded inline audio', () => {
  expect(parseAiJobInput('speech-to-text', {audioBase64: 'UklGRg=='})).toMatchObject({
    audioBase64: 'UklGRg==',
  })
})
