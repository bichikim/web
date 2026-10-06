/** @vitest-environment node */
import type {Response as OpenAiResponse} from 'openai/resources/responses/responses'
import {beforeEach, expect, it, vi} from 'vitest'

const openAiMocks = vi.hoisted(() => ({
  getOpenAiClient: vi.fn(),
  retrieve: vi.fn(),
}))

vi.mock('../openai-client', () => ({getOpenAiClient: openAiMocks.getOpenAiClient}))

import {retrieveHistoryResponse} from '../response-result'

beforeEach(() => {
  vi.clearAllMocks()
  openAiMocks.getOpenAiClient.mockReturnValue({responses: {retrieve: openAiMocks.retrieve}})
})

it('should normalize response metadata and unique web-search sources', async () => {
  openAiMocks.retrieve.mockResolvedValue({
    id: 'response-1',
    metadata: {submission_key: 'submission-1'},
    model: 'gpt-5.5',
    output: [
      {
        action: {sources: [{url: 'https://a.example'}, {url: 'https://a.example'}], type: 'search'},
        type: 'web_search_call',
      },
      {action: {query: 'history', type: 'find'}, type: 'web_search_call'},
      {content: [], type: 'message'},
    ],
    output_text: 'result',
    status: 'completed',
  } as unknown as OpenAiResponse)

  await expect(retrieveHistoryResponse('response-1')).resolves.toEqual({
    metadata: {submission_key: 'submission-1'},
    model: 'gpt-5.5',
    outputText: 'result',
    responseId: 'response-1',
    searchSourceUrls: ['https://a.example'],
    status: 'completed',
  })
  expect(openAiMocks.retrieve).toHaveBeenCalledWith('response-1', {
    include: ['web_search_call.action.sources'],
  })
})

it('should default missing metadata and search sources', () => {
  openAiMocks.retrieve.mockResolvedValue({
    id: 'response-2',
    metadata: null,
    model: 'gpt-5.5',
    output: [{action: {type: 'search'}, type: 'web_search_call'}],
    output_text: '',
    status: 'failed',
  } as unknown as OpenAiResponse)

  return expect(retrieveHistoryResponse('response-2')).resolves.toMatchObject({
    metadata: {},
    searchSourceUrls: [],
  })
})

it('should retain first-seen source order across calls without normalizing URLs or changing output', async () => {
  const sources = Object.freeze([
    Object.freeze({url: 'https://b.example/path'}),
    Object.freeze({url: 'https://a.example'}),
  ])
  const output = Object.freeze([
    {action: {sources, type: 'search'}, type: 'web_search_call'},
    {
      action: {sources: [{url: 'https://ignored.example'}], type: 'open_page'},
      type: 'web_search_call',
    },
    {action: {type: 'search'}, type: 'web_search_call'},
    {content: [], type: 'message'},
    {
      action: {
        sources: [
          {url: 'https://a.example'},
          {url: 'https://b.example/path'},
          {url: 'https://a.example/'},
          {url: 'https://c.example'},
        ],
        type: 'search',
      },
      type: 'web_search_call',
    },
  ])
  const response = {
    id: 'response-ordered',
    metadata: {},
    model: 'gpt-5.5',
    output,
    output_text: 'result',
    status: 'completed',
  }
  openAiMocks.retrieve.mockResolvedValue(response)
  const before = structuredClone(response)

  await expect(retrieveHistoryResponse(response.id)).resolves.toMatchObject({
    searchSourceUrls: [
      'https://b.example/path',
      'https://a.example',
      'https://a.example/',
      'https://c.example',
    ],
  })
  expect(response).toEqual(before)
})

it('should propagate retrieval failures without creating a result', async () => {
  const failure = new Error('OpenAI unavailable')
  openAiMocks.retrieve.mockRejectedValue(failure)
  await expect(retrieveHistoryResponse('response-failed')).rejects.toBe(failure)
})
