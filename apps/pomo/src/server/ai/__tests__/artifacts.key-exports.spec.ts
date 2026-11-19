/** @vitest-environment node */
import {expect, it} from 'vitest'
import * as keys from '../artifact-keys'
import * as storage from '../artifacts'

it('should preserve key behavior and function identity through the storage entry', () => {
  expect(storage).toMatchObject({
    assertAiArtifactIntermediateObjectKeyPrefix: keys.assertAiArtifactIntermediateObjectKeyPrefix,
    assertAiArtifactObjectKey: keys.assertAiArtifactObjectKey,
    createAiArtifactIntermediateObjectKeyPrefix: keys.createAiArtifactIntermediateObjectKeyPrefix,
    createAiArtifactObjectKey: keys.createAiArtifactObjectKey,
    getAiArtifactFilename: keys.getAiArtifactFilename,
    getAiArtifactJobId: keys.getAiArtifactJobId,
    getAiArtifactLifecycle: keys.getAiArtifactLifecycle,
  })

  const jobId = '019d0000-aaaa-7000-8000-000000000001'
  const objectKey = storage.createAiArtifactObjectKey(
    jobId.toUpperCase(),
    'archive',
    ' Result.WAV ',
  )
  expect(storage.assertAiArtifactObjectKey(objectKey)).toBe(`ai/jobs/${jobId}/archive/Result.WAV`)
  expect(storage.getAiArtifactJobId(objectKey)).toBe(jobId)
  expect(storage.getAiArtifactLifecycle(objectKey)).toBe('archive')
  expect(storage.getAiArtifactFilename(objectKey)).toBe('Result.WAV')

  const intermediatePrefix = storage.createAiArtifactIntermediateObjectKeyPrefix(
    jobId.toUpperCase(),
  )
  expect(storage.assertAiArtifactIntermediateObjectKeyPrefix(intermediatePrefix)).toBe(
    `ai/intermediate/${jobId}`,
  )
})
