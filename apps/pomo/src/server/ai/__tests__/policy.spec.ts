/** @vitest-environment node */
import {describe, expect, it} from 'vitest'

import {
  AI_OPERATIONAL_LIMITS,
  getAiArtifactRetention,
  getAiCreditEstimate,
  getAiDownloadExpiry,
  getSubscriptionUsagePeriod,
} from '../policy'

describe('AI operational policy', () => {
  it('anchors a credit period to the subscription renewal day', () => {
    const period = getSubscriptionUsagePeriod(
      new Date('2026-01-31T09:00:00.000Z'),
      new Date('2026-09-20T00:00:00.000Z'),
    )

    expect(period).toEqual({
      end: '2026-09-30',
      start: '2026-08-31',
    })
  })

  it('does not invent a credit charge when the rate profile is absent', () => {
    expect(
      getAiCreditEstimate('text', {
        messages: [{content: '안녕하세요', role: 'user'}],
        parameters: {maximumTokens: 128},
      }),
    ).toMatchObject({
      basis: {inputTokens: 2, outputTokensCap: 128},
      credits: null,
      pricingConfigured: false,
    })
  })

  it('uses capability-specific bases when a measurement profile is configured', () => {
    expect(
      getAiCreditEstimate(
        'sound',
        {durationSeconds: 10, prompt: 'rain', steps: 4},
        {soundDuration: 2, soundStep: 3},
      ),
    ).toEqual({
      basis: {durationSeconds: 10, steps: 4},
      credits: 32,
      pricingConfigured: true,
    })
  })

  it('keeps temporary and unsaved artifacts finite while saved results have no policy expiry', () => {
    const createdAt = new Date('2026-09-20T00:00:00.000Z')

    expect(getAiArtifactRetention('temporary', createdAt)).toEqual(
      new Date('2026-09-21T00:00:00.000Z'),
    )
    expect(getAiArtifactRetention('unsaved-result', createdAt)).toEqual(
      new Date('2026-09-27T00:00:00.000Z'),
    )
    expect(getAiArtifactRetention('saved-result', createdAt)).toBeNull()
    expect(getAiArtifactRetention('operational-record', createdAt)).toEqual(
      new Date('2026-12-19T00:00:00.000Z'),
    )
  })

  it('issues a refreshable ten-minute download lifetime and exposes the execution limits', () => {
    const now = new Date('2026-09-20T00:00:00.000Z')

    expect(getAiDownloadExpiry(now)).toEqual(new Date('2026-09-20T00:10:00.000Z'))
    expect(AI_OPERATIONAL_LIMITS).toMatchObject({
      mediaRunningJobsPerUser: 1,
      runnerInferenceConcurrency: 1,
      urlTtlSeconds: 600,
      userRunningJobs: 2,
    })
  })
})

it('should reserve whole credits by rounding the total estimate up once', () => {
  expect(
    getAiCreditEstimate(
      'text',
      {
        messages: [{content: 'hello', role: 'user'}],
        parameters: {maximumTokens: 4096},
      },
      {textInputToken: 0.1, textOutputToken: 0.1},
    ),
  ).toMatchObject({credits: 410})
})

it('should reject estimates beyond the integer credit ledger range', () => {
  expect(
    getAiCreditEstimate(
      'text',
      {
        messages: [{content: 'hello', role: 'user'}],
        parameters: {maximumTokens: 4096},
      },
      {textInputToken: Number.MAX_SAFE_INTEGER, textOutputToken: Number.MAX_SAFE_INTEGER},
    ),
  ).toMatchObject({credits: null})
})

it('should not add a credit because of decimal floating-point residue', () => {
  expect(
    getAiCreditEstimate(
      'text',
      {
        messages: [{content: 'a'.repeat(400), role: 'user'}],
        parameters: {maximumTokens: 1},
      },
      {textInputToken: 0.07, textOutputToken: 0},
    ),
  ).toMatchObject({credits: 7})
})
