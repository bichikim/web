import * as repository from 'src/server/repositories/api-ai'
import {randomUUID} from 'node:crypto'
import {createApiAiService} from './create-api-ai-service'
import {deliverApiAiJob} from './deliver-api-ai-job'
import {getApiAiProviders} from './providers'
import {responsesAdapter} from './responses-adapter'

const service = createApiAiService({
  adapter: responsesAdapter,
  clock: () => new Date(),
  createAttemptId: randomUUID,
  deliver: deliverApiAiJob,
  legacyWebhook: async (event) => {
    const {handleOpenAiResponseEvent} =
      await import('src/server/history-generation/handle-openai-webhook')
    await handleOpenAiResponseEvent(event)
  },
  providers: getApiAiProviders,
  repository,
})

export const {
  complete: completeApiAiJobs,
  dispatch: dispatchApiAiJobs,
  dispatchJob: dispatchApiAiJob,
  recover: recoverApiAiJobs,
} = service
