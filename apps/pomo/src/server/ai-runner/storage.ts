import {AwsClient} from 'aws4fetch'
import {mkdir, rename, rm, writeFile} from 'node:fs/promises'
import {dirname, isAbsolute, join, relative, resolve} from 'node:path'

import {
  type AiArtifactEnvironment,
  assertAiArtifactObjectKey,
  createAiArtifactObjectUrl,
  deleteAiArtifactObject,
} from '../ai/artifacts.ts'
import {RunnerConfigurationError} from './errors.ts'
import type {RunnerArtifactStore, RunnerStoredArtifact} from './types.ts'

interface RunnerStorageEnvironment extends AiArtifactEnvironment {
  readonly POMO_AI_RUNNER_STORAGE_PATH?: string
}

const DEFAULT_RESULT_FILENAME = 'result'

const normalizeRootDirectory = (directory: string): string => {
  const trimmed = directory.trim()

  if (trimmed.length === 0) {
    throw new RunnerConfigurationError('POMO_AI_RUNNER_STORAGE_PATH must not be empty')
  }

  return resolve(trimmed)
}

const getExtension = (contentType: string): string => {
  switch (contentType.toLowerCase()) {
    case 'audio/wav':
    case 'audio/x-wav':
      return 'wav'
    case 'image/jpeg':
      return 'jpg'
    case 'image/png':
      return 'png'
    default:
      return 'bin'
  }
}

const createObjectKey = (jobId: string, objectKeyPrefix: string, contentType: string): string => {
  const expectedPrefix = `ai/jobs/${jobId}/temporary`

  if (objectKeyPrefix !== expectedPrefix) {
    throw new RunnerConfigurationError('Runner artifacts must use the current job temporary prefix')
  }

  const objectKey = `${objectKeyPrefix}/${DEFAULT_RESULT_FILENAME}.${getExtension(contentType)}`
  assertAiArtifactObjectKey(objectKey)
  return objectKey
}

const assertLocalPath = (rootDirectory: string, objectKey: string): string => {
  const path = join(rootDirectory, ...objectKey.split('/'))
  const pathFromRoot = relative(rootDirectory, path)

  if (
    pathFromRoot.length === 0 ||
    pathFromRoot.startsWith(`..${process.platform === 'win32' ? '\\' : '/'}`) ||
    isAbsolute(pathFromRoot)
  ) {
    throw new RunnerConfigurationError('Runner artifact path escaped its storage root')
  }

  return path
}

const createFileArtifactStore = (rootDirectory: string): RunnerArtifactStore => ({
  delete: async (objectKey) => {
    const path = assertLocalPath(rootDirectory, objectKey)
    await rm(path, {force: true})
  },
  put: async ({bytes, contentType, durationMs, jobId, objectKeyPrefix, signal}) => {
    signal?.throwIfAborted()
    const objectKey = createObjectKey(jobId, objectKeyPrefix, contentType)
    const path = assertLocalPath(rootDirectory, objectKey)
    const temporaryPath = `${path}.tmp-${process.pid}`
    await mkdir(dirname(path), {recursive: true})
    try {
      await writeFile(temporaryPath, bytes, {signal})
      signal?.throwIfAborted()
      await rename(temporaryPath, path)
    } finally {
      await rm(temporaryPath, {force: true})
    }

    const artifact: RunnerStoredArtifact = {
      contentType,
      durationMs,
      objectKey,
      sizeBytes: bytes.byteLength,
    }
    return artifact
  },
})

const createR2ArtifactStore = (environment: RunnerStorageEnvironment): RunnerArtifactStore => {
  const accessKeyId = environment.POMO_AI_ARTIFACT_R2_ACCESS_KEY_ID?.trim()
  const secretAccessKey = environment.POMO_AI_ARTIFACT_R2_SECRET_ACCESS_KEY?.trim()

  if (accessKeyId === undefined || accessKeyId.length === 0) {
    throw new RunnerConfigurationError('POMO_AI_ARTIFACT_R2_ACCESS_KEY_ID is required')
  }

  if (secretAccessKey === undefined || secretAccessKey.length === 0) {
    throw new RunnerConfigurationError('POMO_AI_ARTIFACT_R2_SECRET_ACCESS_KEY is required')
  }

  const signer = new AwsClient({
    accessKeyId,
    region: 'auto',
    secretAccessKey,
    service: 's3',
  })

  return {
    // Cleanup uses the storage operation deadline rather than the already-aborted job signal.
    delete: (objectKey) => deleteAiArtifactObject(objectKey, {environment}),
    put: async ({bytes, contentType, durationMs, jobId, objectKeyPrefix, signal}) => {
      signal?.throwIfAborted()
      const objectKey = createObjectKey(jobId, objectKeyPrefix, contentType)
      const request = new Request(createAiArtifactObjectUrl(objectKey, environment), {
        body: bytes as unknown as BodyInit,
        headers: {
          'Content-Length': String(bytes.byteLength),
          'Content-Type': contentType,
        },
        method: 'PUT',
      })
      const signedRequest = await signer.sign(request, {signal})
      const response = await fetch(signedRequest)

      if (!response.ok) {
        throw new Error(`AI runner artifact upload failed with status ${response.status}`)
      }

      return {contentType, durationMs, objectKey, sizeBytes: bytes.byteLength}
    },
  }
}

export const createRunnerArtifactStore = (
  environment: RunnerStorageEnvironment = process.env,
): RunnerArtifactStore => {
  const localPath = environment.POMO_AI_RUNNER_STORAGE_PATH?.trim()

  if (localPath !== undefined && localPath.length > 0) {
    return createFileArtifactStore(normalizeRootDirectory(localPath))
  }

  if (
    environment.CLOUDFLARE_R2_ACCOUNT_ID !== undefined &&
    environment.POMO_AI_ARTIFACT_R2_BUCKET !== undefined
  ) {
    return createR2ArtifactStore(environment)
  }

  throw new RunnerConfigurationError(
    'Configure POMO_AI_RUNNER_STORAGE_PATH for local mode or the Pomo R2 variables for production',
  )
}
