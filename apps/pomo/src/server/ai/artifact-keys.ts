const UUID_PATTERN = /^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/iu
const ARTIFACT_FILENAME_PATTERN = /^[a-z\d][a-z\d._-]{0,127}$/iu
const ARTIFACT_KEY_SEGMENT_COUNT = 5
export const INTERMEDIATE_OBJECT_KEY_PREFIX = 'ai/intermediate'
const INTERMEDIATE_OBJECT_KEY_PREFIX_PATTERN =
  /^ai\/intermediate\/[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/iu

export const normalizeJobId = (jobId: string): string => {
  if (!UUID_PATTERN.test(jobId)) {
    throw new TypeError('jobId must be a UUID')
  }

  return jobId.toLowerCase()
}

/** Creates the runner-only namespace for raw and intermediate files. */
export const createAiArtifactIntermediateObjectKeyPrefix = (jobId: string): string =>
  `${INTERMEDIATE_OBJECT_KEY_PREFIX}/${normalizeJobId(jobId)}`

export const assertAiArtifactIntermediateObjectKeyPrefix = (objectKeyPrefix: string): string => {
  if (!INTERMEDIATE_OBJECT_KEY_PREFIX_PATTERN.test(objectKeyPrefix)) {
    throw new TypeError('invalid_ai_intermediate_object_key_prefix')
  }

  return objectKeyPrefix
}

export const assertAiArtifactIntermediateObjectKey = (objectKey: string): string => {
  const segments = objectKey.split('/')
  const [root, intermediate, jobId, ...filenameSegments] = segments
  if (
    root !== 'ai' ||
    intermediate !== 'intermediate' ||
    !UUID_PATTERN.test(jobId ?? '') ||
    filenameSegments.length === 0 ||
    filenameSegments.some((segment) => !ARTIFACT_FILENAME_PATTERN.test(segment))
  ) {
    throw new TypeError('invalid_ai_intermediate_object_key')
  }

  return objectKey
}

/** Creates a private R2 key with a lifecycle namespace that cannot be confused with an archive. */
export const createAiArtifactObjectKey = (
  jobId: string,
  lifecycle: 'archive' | 'temporary',
  filename: string,
): string => {
  const normalizedFilename = filename.trim()
  if (!ARTIFACT_FILENAME_PATTERN.test(normalizedFilename)) {
    throw new TypeError('filename must be a single safe artifact segment')
  }

  return `ai/jobs/${normalizeJobId(jobId)}/${lifecycle}/${normalizedFilename}`
}

/** Validates that an artifact key belongs to the private AI job namespace. */
export const assertAiArtifactObjectKey = (objectKey: string): string => {
  const segments = objectKey.split('/')
  const [root, jobs, jobId, lifecycle, filename] = segments
  if (
    segments.length !== ARTIFACT_KEY_SEGMENT_COUNT ||
    root !== 'ai' ||
    jobs !== 'jobs' ||
    !UUID_PATTERN.test(jobId ?? '') ||
    (lifecycle !== 'archive' && lifecycle !== 'temporary') ||
    !ARTIFACT_FILENAME_PATTERN.test(filename ?? '')
  ) {
    throw new TypeError('invalid_ai_artifact_object_key')
  }

  return objectKey
}

export const getAiArtifactJobId = (objectKey: string): string => {
  assertAiArtifactObjectKey(objectKey)
  return objectKey.split('/')[2] ?? ''
}

export const getAiArtifactLifecycle = (objectKey: string): 'archive' | 'temporary' => {
  assertAiArtifactObjectKey(objectKey)
  return objectKey.split('/')[3] as 'archive' | 'temporary'
}

export const getAiArtifactFilename = (objectKey: string): string => {
  assertAiArtifactObjectKey(objectKey)
  return objectKey.split('/')[4] ?? ''
}
