import type {ApiAiJob} from './types'
import {completeCloudText, releaseCloudText} from 'src/server/cloud-text/quota'
import {createApiAiResponseReference} from './response-reference'

/** Applies a terminal job to its originating feature through idempotent completion contracts. */
export const deliverApiAiJob = async (job: ApiAiJob): Promise<void> => {
  switch (job.kind) {
    case 'cloud-text': {
      if (job.ownerId === null) {
        return
      }
      const text = job.result?.outputText.trim() ?? ''
      if (job.status === 'succeeded' && text.length > 0 && job.result?.tokenCount !== null) {
        await completeCloudText({
          requestId: job.id,
          text,
          tokenCount: job.result?.tokenCount ?? 0,
          userId: job.ownerId,
        })
      } else {
        await releaseCloudText(job.ownerId, job.id)
      }
      return
    }
    case 'history': {
      const {handleOpenAiResponseEvent} =
        await import('src/server/history-generation/handle-openai-webhook')
      await handleOpenAiResponseEvent({
        data: {id: createApiAiResponseReference(job.id)},
        id: `api-ai:${job.id}`,
        type:
          job.status === 'succeeded'
            ? 'response.completed'
            : job.status === 'cancelled'
              ? 'response.cancelled'
              : 'response.failed',
      })
      return
    }
    default: {
      const unhandled: never = job.kind
      throw new TypeError(`Unknown AI job kind: ${unhandled}`)
    }
  }
}
