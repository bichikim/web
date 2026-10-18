/** @vitest-environment node */
import {expect, it} from 'vitest'
import {createAiRunnerJobRequest} from '../runner-contract'

const JOB_ID = '019d0000-0000-7000-8000-000000000001'

it.each([
  {capability: 'image', expected: 'image', hasArtifact: true},
  {capability: 'sound', expected: 'sound', hasArtifact: true},
  {capability: 'speech-to-text', expected: 'speech_to_text', hasArtifact: false},
  {capability: 'text', expected: 'text', hasArtifact: false},
  {capability: 'text-to-speech', expected: 'text_to_speech', hasArtifact: true},
] as const)('should encode $capability in the runner request', (request) => {
  const result = createAiRunnerJobRequest({
    capability: request.capability,
    input: {prompt: 'rain'},
    jobId: JOB_ID,
    modelId: 'fixture-model',
  })

  expect(result.capability).toBe(request.expected)
  expect(result.artifact).toEqual(
    request.hasArtifact
      ? {
          intermediateObjectKeyPrefix: `ai/intermediate/${JOB_ID}`,
          objectKeyPrefix: `ai/jobs/${JOB_ID}/temporary`,
        }
      : undefined,
  )
  expect(result).toMatchObject({
    input: {prompt: 'rain'},
    jobId: JOB_ID,
    modelId: 'fixture-model',
    protocolVersion: 1,
  })
})

it('should reject an invalid job ID before producing a runner request', () => {
  expect(() =>
    createAiRunnerJobRequest({
      capability: 'text',
      input: {},
      jobId: 'invalid',
      modelId: 'fixture-model',
    }),
  ).toThrow()
})
