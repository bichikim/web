import {ApiAiAdmissionError} from './admission-error'
import {getApiAiProviders} from './providers'
import {API_AI_POLICY} from 'src/server/api-ai/policy'
import {createHash} from 'node:crypto'
import {env} from 'src/env'
import {createApiAiJob} from 'src/server/repositories/api-ai'
import {createApiAiResponseReference} from './response-reference'
import {dispatchApiAiJob} from './service'

/** Accepts history generation durably and returns an opaque handle before generation completes. */
export const submitQueuedHistoryResponse = async (
  submissionKey: string,
  body: Readonly<Record<string, unknown>>,
): Promise<{readonly responseId: string}> => {
  try {
    getApiAiProviders()
  } catch (cause: unknown) {
    throw new ApiAiAdmissionError('AI history provider configuration is invalid', {cause})
  }
  const now = new Date()
  const result = await createApiAiJob(
    {
      body,
      generationMilliseconds: API_AI_POLICY.historyGenerationMilliseconds,
      id: submissionKey,
      kind: 'history',
      ownerId: null,
      queueExpiresAt: new Date(now.getTime() + API_AI_POLICY.queueMilliseconds),
      requestHash: createHash('sha256').update(JSON.stringify(body)).digest('hex'),
    },
    env.POMO_AI_QUEUE_LIMIT,
    now,
  )
  switch (result.kind) {
    case 'conflict':
    case 'full':
      throw new ApiAiAdmissionError(`AI history queue rejected the request: ${result.kind}`)
    case 'created':
    case 'existing':
      try {
        await dispatchApiAiJob(result.job.id)
      } catch (error: unknown) {
        console.error(
          'AI history job will be recovered after dispatch failure',
          {jobId: result.job.id},
          error,
        )
      }
      return {responseId: createApiAiResponseReference(result.job.id)}
  }
}
