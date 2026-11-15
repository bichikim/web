/** @vitest-environment node */
import {describe, expect, it} from 'vitest'
import {
  assertAiArtifactIntermediateObjectKey,
  assertAiArtifactIntermediateObjectKeyPrefix,
  assertAiArtifactObjectKey,
  createAiArtifactIntermediateObjectKeyPrefix,
  createAiArtifactObjectKey,
  getAiArtifactFilename,
  getAiArtifactJobId,
  getAiArtifactLifecycle,
} from '../artifact-keys'

const JOB_ID = '019d0000-aaaa-7000-8000-000000000001'
const UPPERCASE_JOB_ID = JOB_ID.toUpperCase()

describe('artifact keys', () => {
  it.each(['archive', 'temporary'] as const)(
    'should create and read a %s key without changing the supplied filename case',
    (lifecycle) => {
      const key = createAiArtifactObjectKey(UPPERCASE_JOB_ID, lifecycle, '  Report.JSON  ')

      expect(key).toBe(`ai/jobs/${JOB_ID}/${lifecycle}/Report.JSON`)
      expect(assertAiArtifactObjectKey(key)).toBe(key)
      expect(getAiArtifactJobId(key)).toBe(JOB_ID)
      expect(getAiArtifactLifecycle(key)).toBe(lifecycle)
      expect(getAiArtifactFilename(key)).toBe('Report.JSON')
    },
  )

  it('should preserve the case of an already valid key', () => {
    const key = `ai/jobs/${UPPERCASE_JOB_ID}/temporary/Result.WAV`

    expect(assertAiArtifactObjectKey(key)).toBe(key)
    expect(getAiArtifactJobId(key)).toBe(UPPERCASE_JOB_ID)
    expect(getAiArtifactFilename(key)).toBe('Result.WAV')
  })

  it('should accept a filename at the existing 128-character boundary', () => {
    const filename = 'a'.repeat(128)
    expect(createAiArtifactObjectKey(JOB_ID, 'temporary', filename)).toBe(
      `ai/jobs/${JOB_ID}/temporary/${filename}`,
    )
  })

  it.each([
    {filename: ''},
    {filename: '   '},
    {filename: '.hidden'},
    {filename: '../result.json'},
    {filename: 'nested/result.json'},
    {filename: 'result name.json'},
    {filename: 'a'.repeat(129)},
  ])('should reject an invalid filename $filename before constructing a key', ({filename}) => {
    expect(() => createAiArtifactObjectKey(JOB_ID, 'temporary', filename)).toThrow(
      new TypeError('filename must be a single safe artifact segment'),
    )
  })

  it('should validate the filename before the job ID', () => {
    expect(() => createAiArtifactObjectKey('invalid', 'temporary', '../file')).toThrow(
      new TypeError('filename must be a single safe artifact segment'),
    )
    expect(() => createAiArtifactObjectKey('invalid', 'temporary', 'file.txt')).toThrow(
      new TypeError('jobId must be a UUID'),
    )
  })

  it.each([
    {key: ''},
    {key: `other/jobs/${JOB_ID}/temporary/file.txt`},
    {key: `ai/other/${JOB_ID}/temporary/file.txt`},
    {key: 'ai/jobs/invalid/temporary/file.txt'},
    {key: `ai/jobs/${JOB_ID}/other/file.txt`},
    {key: `ai/jobs/${JOB_ID}/temporary/`},
    {key: `ai/jobs/${JOB_ID}/temporary/nested/file.txt`},
    {key: `ai/jobs/${JOB_ID}/temporary/.hidden`},
    {key: `ai/jobs/${JOB_ID}/temporary/${'a'.repeat(129)}`},
  ])('should reject invalid keys consistently in every reader: $key', ({key}) => {
    for (const read of [
      assertAiArtifactObjectKey,
      getAiArtifactJobId,
      getAiArtifactLifecycle,
      getAiArtifactFilename,
    ]) {
      expect(() => read(key)).toThrow(new TypeError('invalid_ai_artifact_object_key'))
    }
  })
})

describe('intermediate key prefixes', () => {
  it('should normalize a new prefix while preserving an already valid prefix', () => {
    expect(createAiArtifactIntermediateObjectKeyPrefix(UPPERCASE_JOB_ID)).toBe(
      `ai/intermediate/${JOB_ID}`,
    )
    const prefix = `ai/intermediate/${UPPERCASE_JOB_ID}`
    expect(assertAiArtifactIntermediateObjectKeyPrefix(prefix)).toBe(prefix)
  })

  it.each([
    {prefix: ''},
    {prefix: 'ai/intermediate/invalid'},
    {prefix: `ai/jobs/${JOB_ID}`},
    {prefix: `ai/intermediate/${JOB_ID}/`},
    {prefix: `ai/intermediate/${JOB_ID}/file.txt`},
  ])('should reject a noncanonical intermediate prefix $prefix', ({prefix}) => {
    expect(() => assertAiArtifactIntermediateObjectKeyPrefix(prefix)).toThrow(
      new TypeError('invalid_ai_intermediate_object_key_prefix'),
    )
  })
})

describe('intermediate object keys', () => {
  it.each([
    {filename: 'chunk.pcm'},
    {filename: 'parts/0001.raw'},
    {filename: 'raw/chunks/End.WAV'},
  ])('should preserve the intermediate path $filename', ({filename}) => {
    const key = `ai/intermediate/${UPPERCASE_JOB_ID}/${filename}`
    expect(assertAiArtifactIntermediateObjectKey(key)).toBe(key)
    expect(() => assertAiArtifactObjectKey(key)).toThrow(
      new TypeError('invalid_ai_artifact_object_key'),
    )
  })

  it.each([
    {key: ''},
    {key: `other/intermediate/${JOB_ID}/file.txt`},
    {key: `ai/jobs/${JOB_ID}/file.txt`},
    {key: 'ai/intermediate/invalid/file.txt'},
    {key: `ai/intermediate/${JOB_ID}`},
    {key: `ai/intermediate/${JOB_ID}/`},
    {key: `ai/intermediate/${JOB_ID}/../file.txt`},
    {key: `ai/intermediate/${JOB_ID}/nested//file.txt`},
    {key: `ai/intermediate/${JOB_ID}/${'a'.repeat(129)}`},
  ])('should reject an invalid intermediate object key $key', ({key}) => {
    expect(() => assertAiArtifactIntermediateObjectKey(key)).toThrow(
      new TypeError('invalid_ai_intermediate_object_key'),
    )
  })
})
