import type {Response, ResponseFunctionWebSearch} from 'openai/resources/responses/responses'

export interface HistoryResponseResult {
  readonly metadata: Readonly<Record<string, string>>
  readonly model: string
  readonly outputText: string
  readonly responseId: string
  readonly searchSourceUrls: ReadonlyArray<string>
  readonly status: Response['status']
}

const extractSearchSources = (response: Response): ReadonlyArray<string> => {
  const urls = new Set<string>()

  for (const item of response.output) {
    if (item.type === 'web_search_call') {
      const action: ResponseFunctionWebSearch['action'] = item.action

      if (action.type === 'search') {
        for (const source of action.sources ?? []) {
          urls.add(source.url)
        }
      }
    }
  }

  return [...urls]
}

/** Retrieves a background response with the complete web-search source list. */
export const retrieveHistoryResponse = async (
  responseId: string,
): Promise<HistoryResponseResult> => {
  const {getOpenAiClient} = await import('./openai-client')
  const response = await getOpenAiClient().responses.retrieve(responseId, {
    include: ['web_search_call.action.sources'],
  })

  return {
    metadata: response.metadata ?? {},
    model: response.model,
    outputText: response.output_text,
    responseId: response.id,
    searchSourceUrls: extractSearchSources(response),
    status: response.status,
  }
}
