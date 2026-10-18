import * as repository from 'src/server/repositories/api-ai'
import {randomUUID} from 'node:crypto'
import {createApiAiService} from './create-api-ai-service'
import {deliverApiAiJob} from './deliver-api-ai-job'
import {getApiAiProviders, getConfiguredApiAiProviders} from './providers'
import {responsesAdapter} from './responses-adapter'
import {createOpenRouterAdapter} from './create-openrouter-adapter'
import {createApiAiQueue} from './queue'

const service = createApiAiService({
  adapter: responsesAdapter,
  clock: () => new Date(),
  createAttemptId: randomUUID,
  defaultProviders: getApiAiProviders,
  deliver: deliverApiAiJob,
  legacyWebhook: async (event) => {
    const {handleOpenAiResponseEvent} =
      await import('src/server/history-generation/handle-openai-webhook')
    await handleOpenAiResponseEvent(event)
  },
  providers: getConfiguredApiAiProviders,
  queue: {
    adapter: createOpenRouterAdapter(),
    enqueue: createApiAiQueue(async (jobId): Promise<void> => service.executeQueuedJob(jobId)),
    monitorBackground:
      process.env.NODE_ENV === 'development' && process.env.VERCEL_DEPLOYMENT_ID === undefined,
  },
  repository,
})

export const {
  complete: completeApiAiJobs,
  dispatch: dispatchApiAiJobs,
  dispatchJob: dispatchApiAiJob,
  executeQueuedJob: executeQueuedApiAiJob,
  recover: recoverApiAiJobs,
} = service
