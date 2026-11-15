/** @vitest-environment node */
import {expect, it, vi} from 'vitest'

const observations = vi.hoisted(() => {
  vi.resetModules()
  return {storageImports: 0}
})

vi.mock('aws4fetch', () => {
  observations.storageImports += 1
  return {AwsClient: class {}}
})

import {createAiRunnerJobRequest} from '../runner-contract'

it('should construct the runner artifact namespaces without importing the storage SDK', () => {
  const jobId = '019d0000-aaaa-7000-8000-000000000001'
  const request = createAiRunnerJobRequest({
    capability: 'image',
    input: {prompt: 'rain'},
    jobId,
    modelId: 'fixture-model',
  })

  expect(request).toEqual({
    artifact: {
      intermediateObjectKeyPrefix: `ai/intermediate/${jobId}`,
      objectKeyPrefix: `ai/jobs/${jobId}/temporary`,
    },
    capability: 'image',
    input: {prompt: 'rain'},
    jobId,
    modelId: 'fixture-model',
    protocolVersion: 1,
  })
  expect(observations.storageImports).toBe(0)
})
