import type {APIEvent} from '@solidjs/start/server'
import {handleCallback} from '@vercel/queue'
import {z} from 'zod'
import {executeQueuedApiAiJob} from 'src/server/api-ai/service'

const messageSchema = z.object({jobId: z.uuid()}).strict()
const handleMessage = handleCallback(
  async (message: unknown) => {
    const parsed = messageSchema.safeParse(message)
    if (!parsed.success) {
      console.error('Invalid API AI queue message', parsed.error.message)
      return
    }
    await executeQueuedApiAiJob(parsed.data.jobId)
  },
  {retry: () => ({afterSeconds: 30})},
)

/** Handles the internal Vercel Queue trigger through the SDK callback. */
export const POST = (event: APIEvent): Promise<Response> => handleMessage(event.request)
