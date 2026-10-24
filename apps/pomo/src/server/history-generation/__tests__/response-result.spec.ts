/** @vitest-environment node */
import type {Response as OpenAiResponse} from 'openai/resources/responses/responses'
import {beforeEach, expect, it, vi} from 'vitest'
import {findApiAiJob} from 'src/server/repositories/api-ai'
import type {ApiAiStatus} from 'src/server/api-ai/types'

const openAiMocks = vi.hoisted(() => ({
  getOpenAiClient: vi.fn(),
  retrieve: vi.fn(),
}))

vi.mock('../openai-client', () => ({getOpenAiClient: openAiMocks.getOpenAiClient}))
vi.mock('src/server/repositories/api-ai', () => ({findApiAiJob: vi.fn()}))

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

const queuedStatuses = [
  ['queued', 'queued'],
  ['submitting', 'in_progress'],
  ['running', 'in_progress'],
  ['recovery_pending', 'in_progress'],
  ['succeeded', 'completed'],
  ['failed', 'failed'],
  ['cancelled', 'cancelled'],
] as const satisfies ReadonlyArray<readonly [ApiAiStatus, string]>

it.each(queuedStatuses)(
  'should map queued history status %s to %s without contacting the provider',
  async (status, expected) => {
    vi.mocked(findApiAiJob).mockResolvedValue({
      activeAttemptId: null,
      body: {
        metadata: {generation_run_id: 'run', ignored: 1, submission_key: 'submission'},
        model: 'primary',
      },
      cancelRequestedAt: null,
      id: '00000000-0000-4000-8000-000000000001',
      kind: 'history',
      ownerId: null,
      result: {
        failureCode: null,
        fallback: true,
        metadata: {},
        model: 'fallback',
        outputText: 'stored result',
        responseId: 'response-fallback',
        searchSourceUrls: ['https://source.example'],
        status: 'completed',
        tokenCount: 10,
      },
      status,
    })
    expect(
      await retrieveHistoryResponse('pomo-api:00000000-0000-4000-8000-000000000001'),
    ).toMatchObject({
      metadata: {generation_run_id: 'run', submission_key: 'submission'},
      model: 'fallback',
      outputText: 'stored result',
      searchSourceUrls: ['https://source.example'],
      status: expected,
    })
    expect(openAiMocks.getOpenAiClient).not.toHaveBeenCalled()
  },
)
