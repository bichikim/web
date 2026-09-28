/** @vitest-environment node */
import {beforeEach, describe, expect, it, vi} from 'vitest'

const environmentMocks = vi.hoisted(() => ({isAuthorizedCronRequest: vi.fn()}))
const paymentMocks = vi.hoisted(() => ({retryPaddleProviderEvents: vi.fn()}))

vi.mock('src/server/cron/environment', () => environmentMocks)
vi.mock('src/server/payment', () => paymentMocks)

import {invokeApiRoute} from '../../__tests__/invoke'
import {GET} from '../payments'

const request = new Request('https://pomo.example/api/cron/payments')

beforeEach(() => {
  vi.clearAllMocks()
  environmentMocks.isAuthorizedCronRequest.mockReturnValue(true)
  paymentMocks.retryPaddleProviderEvents.mockResolvedValue({
    failed: 0,
    processed: 2,
    rejected: 1,
    skipped: 0,
  })
})

describe('payment event retry route', () => {
  it('should return retry totals for an authorized cron request', async () => {
    const response = await invokeApiRoute(GET, request)

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      failed: 0,
      processed: 2,
      rejected: 1,
      skipped: 0,
    })
  })

  it('should reject an unauthorized cron request', async () => {
    environmentMocks.isAuthorizedCronRequest.mockReturnValue(false)

    const response = await invokeApiRoute(GET, request)

    expect(response.status).toBe(401)
    expect(paymentMocks.retryPaddleProviderEvents).not.toHaveBeenCalled()
  })

  it('should expose retry failures as an internal server error', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    paymentMocks.retryPaddleProviderEvents.mockRejectedValue(new Error('database unavailable'))

    const response = await invokeApiRoute(GET, request)

    expect(response.status).toBe(500)
    await expect(response.text()).resolves.toBe('Payment event retry failed')
  })
})
