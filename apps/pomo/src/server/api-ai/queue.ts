import {QueueClient, registerDevConsumer} from '@vercel/queue'
import {z} from 'zod'
import {API_AI_POLICY} from './policy'

export const API_AI_QUEUE_TOPIC = 'pomo-api-ai'
const MILLISECONDS_PER_SECOND = 1000
const messageSchema = z.object({jobId: z.uuid()}).strict()

/** Creates a job publisher with local development delivery to the supplied executor. */
export const createApiAiQueue = (
  executeJob: (jobId: string) => Promise<void>,
): ((jobId: string) => Promise<void>) => {
  const client = new QueueClient()
  return async (jobId) => {
    if (process.env.NODE_ENV === 'development' && process.env.VERCEL_DEPLOYMENT_ID === undefined) {
      registerDevConsumer({
        client,
        consumerGroup: API_AI_QUEUE_TOPIC,
        handler: async (message) => executeJob(messageSchema.parse(message).jobId),
        retry: () => ({afterSeconds: API_AI_POLICY.retryMilliseconds / MILLISECONDS_PER_SECOND}),
        topic: API_AI_QUEUE_TOPIC,
      })
    }
    await client.send(
      API_AI_QUEUE_TOPIC,
      {jobId},
      {
        idempotencyKey: jobId,
        retentionSeconds: API_AI_POLICY.queueMilliseconds / MILLISECONDS_PER_SECOND,
      },
    )
  }
}
