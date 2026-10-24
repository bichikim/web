import type {Response} from 'openai/resources/responses/responses'
import {parseApiAiResponseReference} from 'src/server/api-ai/response-reference'
import {extractSearchSourceUrls} from 'src/server/api-ai/extract-search-source-urls'
import type {ApiAiStatus} from 'src/server/api-ai/types'

export interface HistoryResponseResult {
  readonly metadata: Readonly<Record<string, string>>
  readonly model: string
  readonly outputText: string
  readonly responseId: string
  readonly searchSourceUrls: ReadonlyArray<string>
  readonly status: Response['status']
}

const historyStatus = (status: ApiAiStatus): Response['status'] => {
  switch (status) {
    case 'succeeded':
      return 'completed'
    case 'failed':
      return 'failed'
    case 'cancelled':
      return 'cancelled'
    case 'queued':
      return 'queued'
    case 'submitting':
    case 'running':
    case 'recovery_pending':
      return 'in_progress'
    default: {
      const exhaustive: never = status
      return exhaustive
    }
  }
}

/** Retrieves a background response with the complete web-search source list. */
export const retrieveHistoryResponse = async (
  responseId: string,
): Promise<HistoryResponseResult> => {
  const jobId = parseApiAiResponseReference(responseId)
  if (jobId !== null) {
    const {findApiAiJob} = await import('src/server/repositories/api-ai')
    const job = await findApiAiJob(jobId)
    if (job === null || job.kind !== 'history') {
      throw new TypeError('History AI job was not found')
    }
    const metadata =
      typeof job.body.metadata === 'object' && job.body.metadata !== null
        ? Object.fromEntries(
            Object.entries(job.body.metadata).filter(
              (entry): entry is [string, string] => typeof entry[1] === 'string',
            ),
          )
        : {}
    return {
      metadata,
      model: job.result?.model ?? String(job.body.model ?? ''),
      outputText: job.result?.outputText ?? '',
      responseId,
      searchSourceUrls: job.result?.searchSourceUrls ?? [],
      status: historyStatus(job.status),
    }
  }
  const {getOpenAiClient} = await import('./openai-client')
  const response = await getOpenAiClient().responses.retrieve(responseId, {
    include: ['web_search_call.action.sources'],
  })

  return {
    metadata: response.metadata ?? {},
    model: response.model,
    outputText: response.output_text,
    responseId: response.id,
    searchSourceUrls: extractSearchSourceUrls(response.output),
    status: response.status,
  }
}
