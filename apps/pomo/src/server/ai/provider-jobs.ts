import {type AiJobRecord, expireAiJob} from 'src/server/repositories/ai-jobs'

import {cancelLunaTextJob} from './openai-text'
import {createAiRunnerClient} from './runner-client'

import {OPENAI_RESPONSE_PREFIX} from './service-shared'
export {OPENAI_RESPONSE_PREFIX} from './service-shared'

export const cancelAiProviderJob = async (job: AiJobRecord): Promise<void> => {
  if (job.runnerJobId === null) {
    return
  }

  if (job.runnerJobId.startsWith(OPENAI_RESPONSE_PREFIX)) {
    await cancelLunaTextJob(job.runnerJobId.slice(OPENAI_RESPONSE_PREFIX.length))
    return
  }

  await createAiRunnerClient().cancel(job.runnerJobId)
}

export const expireAiProviderJob = async (job: AiJobRecord): Promise<AiJobRecord | null> => {
  try {
    await cancelAiProviderJob(job)
  } catch (error: unknown) {
    console.error('Failed to cancel an expired AI provider job', {jobId: job.id}, error)
  }

  return expireAiJob(job.id)
}
