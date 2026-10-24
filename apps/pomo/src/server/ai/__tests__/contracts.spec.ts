/** @vitest-environment node */
import {describe, expect, it} from 'vitest'

import {
  parseAiJobInput,
  parseAiJobResult,
  runnerCapabilityFor,
  textJobInputSchema,
} from '../contracts'

describe('textJobInputSchema message roles', () => {
  const createInput = (role: unknown) => ({messages: [{content: '  질문  ', role}]})

  it.each(['assistant', 'system', 'user'])(
    'should accept the %s role while retaining content trimming and parameter defaults',
    (role) => {
      expect(textJobInputSchema.parse(createInput(role))).toEqual({
        messages: [{content: '질문', role}],
        parameters: {maximumTokens: 4096},
      })
    },
  )

  it.each(['developer', 'tool', ' user ', null, undefined, 0])(
    'should reject unsupported message role %s with the ordered role diagnostic',
    (role) => {
      const result = textJobInputSchema.safeParse(createInput(role))

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues).toEqual([
          expect.objectContaining({
            code: 'invalid_value',
            path: ['messages', 0, 'role'],
            values: ['assistant', 'system', 'user'],
          }),
        ])
      }
    },
  )
})

describe('AI job contracts', () => {
  it('validates text input and maps capability names for the runner', () => {
    const input = parseAiJobInput('text', {
      messages: [{content: '안녕하세요', role: 'user'}],
    })

    expect(input).toMatchObject({messages: [{content: '안녕하세요', role: 'user'}]})
    expect(runnerCapabilityFor('speech-to-text')).toBe('speech_to_text')
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
