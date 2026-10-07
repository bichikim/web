/** @vitest-environment node */
import {beforeEach, expect, it, vi} from 'vitest'
import {createDeferred} from 'src/test-utils/create-deferred'
import {requestCloudText} from 'src/features/cloud-text/client'
import type {CloudTextResponse} from 'src/features/cloud-text/contracts'
import {CLOUD_TEXT_RESPONSE} from 'src/features/cloud-text/__tests__/fixtures/response'
import {createTarotClient} from '../client'
import {TAROT_CARDS} from '../cards'

vi.mock('src/features/cloud-text/client', () => ({requestCloudText: vi.fn()}))

beforeEach(() => vi.resetAllMocks())

it('should send tarot meanings through one cloud request without a local Worker', async () => {
  const deferred = createDeferred<CloudTextResponse>()
  vi.mocked(requestCloudText).mockReturnValue(deferred.promise)
  const onResponse = vi.fn()
  const client = createTarotClient({modelId: 'cloud', onResponse})
  client.generate({
    cards: [{...TAROT_CARDS[0]!, orientation: 'upright'}],
    locale: 'ko',
    modelId: 'cloud',
    question: '오늘 어떤 마음으로 지낼까요?',
    requestId: 'reading-1',
    type: 'generate',
  })
  expect(requestCloudText).toHaveBeenCalledOnce()
  expect(vi.mocked(requestCloudText).mock.calls[0]![0].messages.at(-1)?.content).toContain(
    '오늘 어떤 마음으로 지낼까요?',
  )
  deferred.resolve(CLOUD_TEXT_RESPONSE)
  await deferred.promise
  expect(onResponse).toHaveBeenLastCalledWith({
    requestId: 'reading-1',
    text: CLOUD_TEXT_RESPONSE.text,
    type: 'complete',
  })
  client.dispose()
})
