import type {CloudTextRequest} from 'src/features/cloud-text/contracts'
import {beforeEach, expect, it, vi} from 'vitest'
import {getOpenAiClient} from 'src/server/history-generation/openai-client'
import {completeCloudText, readCloudTextUsage, releaseCloudText, reserveCloudText} from '../quota'
import {generateCloudText} from '../service'

vi.mock('src/server/history-generation/openai-client', () => ({getOpenAiClient: vi.fn()}))
vi.mock('../quota', () => ({
  completeCloudText: vi.fn(),
  readCloudTextUsage: vi.fn(),
  releaseCloudText: vi.fn(),
  reserveCloudText: vi.fn(),
}))
const create = vi.fn()
const usage = {
  day: '2026-10-07',
  limit: 3,
  remaining: 2,
  resetsAt: '2026-10-07T15:00:00.000Z',
  used: 1,
}
const request: CloudTextRequest = {
  maximumTokens: 2560,
  messages: [{content: '타로를 해석하세요.', role: 'user'}],
  requestId: '00000000-0000-4000-8000-000000000001',
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(getOpenAiClient).mockReturnValue({responses: {create}} as unknown as ReturnType<
    typeof getOpenAiClient
  >)
  vi.mocked(reserveCloudText).mockResolvedValue({kind: 'reserved', usage})
  vi.mocked(readCloudTextUsage).mockResolvedValue(usage)
  create.mockResolvedValue({
    output_text: ' 타로 결과 ',
    status: 'completed',
    usage: {total_tokens: 500},
  })
})

it('should reuse the server OpenAI client and charge one complete Luna generation', async () => {
  expect(await generateCloudText('user', request)).toEqual({
    kind: 'complete',
    text: '타로 결과',
    tokenCount: 500,
    usage,
  })
  expect(create).toHaveBeenCalledWith(
    expect.objectContaining({
      max_output_tokens: 2560,
      model: 'gpt-6-luna',
      reasoning: {effort: 'none'},
      store: false,
    }),
    expect.objectContaining({idempotencyKey: request.requestId, maxRetries: 0}),
  )
  expect(completeCloudText).toHaveBeenCalledWith({
    requestId: request.requestId,
    text: '타로 결과',
    tokenCount: 500,
    userId: 'user',
  })
  expect(releaseCloudText).not.toHaveBeenCalled()
})

it('should block exhausted accounts before calling the provider', async () => {
  vi.mocked(reserveCloudText).mockResolvedValue({
    kind: 'exhausted',
    usage: {...usage, remaining: 0, used: 3},
  })
  expect(await generateCloudText('user', request)).toMatchObject({kind: 'exhausted'})
  expect(create).not.toHaveBeenCalled()
})

it('should deliver a committed generation even if refreshing its usage fails', async () => {
  vi.mocked(readCloudTextUsage).mockRejectedValue(new Error('Usage read unavailable'))
  const logger = vi.spyOn(console, 'error').mockImplementation(() => undefined)
  try {
    await expect(generateCloudText('user', request)).resolves.toEqual({
      kind: 'complete',
      text: '타로 결과',
      tokenCount: 500,
      usage,
    })
    expect(completeCloudText).toHaveBeenCalledOnce()
    expect(releaseCloudText).not.toHaveBeenCalled()
  } finally {
    logger.mockRestore()
  }
})

it('should replay a completed request without provider work or another charge', async () => {
  vi.mocked(reserveCloudText).mockResolvedValue({
    kind: 'existing',
    text: '저장된 리딩',
    tokenCount: 200,
    usage,
  })
  expect(await generateCloudText('user', request)).toEqual({
    kind: 'complete',
    text: '저장된 리딩',
    tokenCount: 200,
    usage,
  })
  expect(create).not.toHaveBeenCalled()
  expect(completeCloudText).not.toHaveBeenCalled()
})

it('should return the reserved allowance after provider failure', async () => {
  create.mockRejectedValue(new Error('Provider unavailable'))
  await expect(generateCloudText('user', request)).rejects.toThrow('Provider unavailable')
  expect(releaseCloudText).toHaveBeenCalledWith('user', request.requestId)
  expect(completeCloudText).not.toHaveBeenCalled()
})

it('should refund incomplete text instead of charging it as a successful generation', async () => {
  create.mockResolvedValue({
    output_text: '부분 결과',
    status: 'incomplete',
    usage: {total_tokens: 100},
  })
  await expect(generateCloudText('user', request)).rejects.toThrow('did not complete')
  expect(releaseCloudText).toHaveBeenCalledOnce()
})
