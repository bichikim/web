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

describe('credit arithmetic contracts', () => {
  it.each([
    {expected: 2147483647, name: 'exact ledger maximum', rate: 2147483647},
    {expected: null, name: 'above ledger maximum', rate: 2147483648},
    {expected: null, name: 'negative rate', rate: -1},
    {expected: null, name: 'NaN rate', rate: Number.NaN},
    {expected: null, name: 'infinite rate', rate: Number.POSITIVE_INFINITY},
    {expected: null, name: 'negative infinite rate', rate: Number.NEGATIVE_INFINITY},
    {expected: 0, name: 'zero rate', rate: 0},
    {expected: 0, name: 'negative zero rate', rate: -0},
    {expected: 1, name: 'smallest rate', rate: Number.MIN_VALUE},
    {expected: null, name: 'largest rate', rate: Number.MAX_VALUE},
  ])('should retain $name in duration estimates', ({rate, expected}) => {
    expect(
      getAiCreditEstimate('speech-to-text', {durationSeconds: 1}, {speechToTextDuration: rate}),
    ).toEqual({
      basis: {durationSeconds: 1},
      credits: expected,
      pricingConfigured: true,
    })
  })

  it.each([
    undefined,
    null,
    -1,
    0.5,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.MAX_SAFE_INTEGER + 1,
  ])('should retain a null estimate for an invalid duration: %s', (durationSeconds) => {
    expect(
      getAiCreditEstimate('text-to-speech', {durationSeconds}, {textToSpeechDuration: 1}),
    ).toEqual({
      basis: {durationSeconds: null},
      credits: null,
      pricingConfigured: true,
    })
  })

  it('should retain a null estimate for a missing member of a configured profile', () => {
    expect(
      getAiCreditEstimate('sound', {durationSeconds: 1, steps: 1}, {soundDuration: 1}),
    ).toEqual({
      basis: {durationSeconds: 1, steps: 1},
      credits: null,
      pricingConfigured: false,
    })
  })

  it('should retain a null estimate when image multiplication exceeds the quantity range', () => {
    expect(
      getAiCreditEstimate(
        'image',
        {height: 2, steps: 1, width: Number.MAX_SAFE_INTEGER},
        {imagePixels: 0, imageStep: 1},
      ),
    ).toMatchObject({credits: null, pricingConfigured: true})
  })

  it('should retain a tiny increment above an exact integer across separate bases', () => {
    expect(
      getAiCreditEstimate(
        'sound',
        {durationSeconds: 1, steps: 1},
        {soundDuration: 1, soundStep: Number.MIN_VALUE},
      ),
    ).toMatchObject({credits: 2})
  })

  it('should round image products once after summing both bases', () => {
    expect(
      getAiCreditEstimate(
        'image',
        {height: 10, steps: 1, width: 10},
        {imagePixels: 0.007, imageStep: 0.3},
      ),
    ).toMatchObject({credits: 1})
  })
})
