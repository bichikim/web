import type {AiArtifactRecord, AiJobRecord} from 'src/server/repositories/ai-jobs'

import type {createAiArtifactDownloadUrl} from './artifacts'
import {MINIMUM_DOWNLOAD_LIFETIME_MS} from './service-shared'

export interface AiPublicServiceDependencies {
  readonly clock: () => Date
  readonly createDownloadUrl: typeof createAiArtifactDownloadUrl
  readonly findArtifactForUser: (jobId: string, userId: string) => Promise<AiArtifactRecord | null>
}

export const createPublicAiJobService = (dependencies: AiPublicServiceDependencies) => {
  const createAiJobResult = async (job: AiJobRecord): Promise<AiJobRecord['result']> => {
    if (
      job.result === null ||
      typeof job.result.artifact !== 'object' ||
      job.result.artifact === null
    ) {
      return job.result
    }

    const artifact = await dependencies.findArtifactForUser(job.id, job.userId)
    if (artifact === null) {
      return null
    }

    const now = dependencies.clock()
    if (
      artifact.expiresAt !== null &&
      artifact.expiresAt.getTime() - now.getTime() < MINIMUM_DOWNLOAD_LIFETIME_MS
    ) {
      return null
    }

    const download = await dependencies.createDownloadUrl(artifact.objectKey, {
      expiresAt: artifact.expiresAt,
      now,
    })
    return {
      ...job.result,
      artifact: {
        contentType: artifact.contentType,
        expiresAt: download.expiresAt.toISOString(),
        ...(artifact.durationMs === null ? {} : {durationMs: artifact.durationMs}),
        ...(artifact.sizeBytes === null ? {} : {sizeBytes: artifact.sizeBytes}),
        url: download.url,
      },
    }
  }

  return {createAiJobResult}
}

const createPublicResultMetadata = (result: AiJobRecord['result']): AiJobRecord['result'] => {
  if (result === null || typeof result.artifact !== 'object' || result.artifact === null) {
    return result
  }

  const {contentType, durationMs, sizeBytes} = result.artifact as Readonly<Record<string, unknown>>
  return {
    ...result,
    artifact: {
      contentType,
      ...(typeof durationMs === 'number' ? {durationMs} : {}),
      ...(typeof sizeBytes === 'number' ? {sizeBytes} : {}),
    },
  }
}

export const createPublicJob = (job: AiJobRecord) => ({
  capability: job.capability,
  completedAt: job.completedAt?.toISOString() ?? null,
  createdAt: job.createdAt.toISOString(),
  error: job.errorCode === null ? null : {code: job.errorCode, message: job.errorMessage},
  id: job.id,
  lastRunnerError: job.lastRunnerError,
  modelId: job.modelId,
  progress: job.progress,
  result: createPublicResultMetadata(job.result),
  startedAt: job.startedAt?.toISOString() ?? null,
  status: job.status,
  timeoutAt: job.timeoutAt.toISOString(),
  updatedAt: job.updatedAt.toISOString(),
})
