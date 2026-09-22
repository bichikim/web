/** @vitest-environment node */
import {expect, it, vi} from 'vitest'
import {aiJobClient} from '../client'
import {apiJsonRequest} from '../../api-json'
vi.mock('../../api-json', () => ({apiJsonRequest: vi.fn(), parseJsonResponse: vi.fn()}))

it('should reject direct client calls without sending an unreleased API request', async () => {
  await expect(aiJobClient.readTextAccess()).rejects.toMatchObject({
    code: 'ai_feature_unreleased',
    status: 404,
  })
  await expect(
    aiJobClient.submitTextJob({
      idempotencyKey: 'unreleased-job',
      input: {messages: [{content: 'hello', role: 'user'}]},
    }),
  ).rejects.toMatchObject({code: 'ai_feature_unreleased', status: 404})
  expect(apiJsonRequest).not.toHaveBeenCalled()
})
