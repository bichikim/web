import {env} from 'src/env'
import * as repository from 'src/server/repositories/ai-jobs'
import * as storage from './artifacts'
import {cancelAiProviderJob, expireAiProviderJob} from './provider-jobs'
import {createAiRunnerClient} from './runner-client'
import {dispatchJob, persistAcceptedProvider} from './service-dispatch'
import {retrieveLunaTextJob} from './openai-text'
import {createAiJobSynchronizer} from './service-sync'
import {createAiJobService} from './create-ai-job-service'

const clock = (): Date => new Date()
const synchronizer = createAiJobSynchronizer({
  clock,
  dispatchJob,
  expireAiProviderJob,
  getRunnerStatus: (jobId) => createAiRunnerClient().getStatus(jobId),
  persistAcceptedProvider,
  repository,
  retrieveLunaTextJob,
})
const service = createAiJobService({
  cancelAiProviderJob,
  clock,
  config: env,
  dispatchJob,
  expireAiProviderJob,
  repository,
  storage,
  synchronizer,
})

export const {
  getAiTextAccess,
  submitAiJob,
  getAiJobStatus,
  cancelAiJobForUser,
  createAiJobResult,
  saveAiJobArtifactForUser,
  deleteAiJobArtifactForUser,
  recoverAiJobs,
} = service
export {createPublicJob} from './service-public'
export type {AiTextAccess} from './create-ai-job-service'
export type {
  AiServiceErrorCode,
  CreateAiJobServiceResult,
  DispatchAiJobResult,
} from './service-shared'
