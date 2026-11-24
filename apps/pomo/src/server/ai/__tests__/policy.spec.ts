/** @vitest-environment node */
import {describe, expect, it, vi} from 'vitest'

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

  it('should reject a tiny increment above the ledger maximum', () => {
    expect(
      getAiCreditEstimate(
        'sound',
        {durationSeconds: 1, steps: 1},
        {soundDuration: 2147483647, soundStep: Number.MIN_VALUE},
      ),
    ).toMatchObject({credits: null})
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

describe('subscription usage periods', () => {
  it.each([
    {
      expected: {end: '2026-02-28', start: '2026-01-31'},
      name: 'the subscription start instant',
      now: '2026-01-31T09:00:00.000Z',
      startsAt: '2026-01-31T09:00:00.000Z',
    },
    {
      expected: {end: '2026-03-31', start: '2026-02-28'},
      name: 'the first renewal millisecond',
      now: '2026-02-28T00:00:00.000Z',
      startsAt: '2026-01-31T09:00:00.000Z',
    },
    {
      expected: {end: '2026-02-28', start: '2026-01-31'},
      name: 'the millisecond before renewal',
      now: '2026-02-27T23:59:59.999Z',
      startsAt: '2026-01-31T09:00:00.000Z',
    },
    {
      expected: {end: '2026-03-31', start: '2026-02-28'},
      name: 'the millisecond after renewal',
      now: '2026-02-28T00:00:00.001Z',
      startsAt: '2026-01-31T09:00:00.000Z',
    },
    {
      expected: {end: '2024-03-31', start: '2024-02-29'},
      name: 'a leap-year February',
      now: '2024-02-29T00:00:00.000Z',
      startsAt: '2024-01-31T09:00:00.000Z',
    },
    {
      expected: {end: '2025-03-29', start: '2025-02-28'},
      name: 'the original leap-day anchor after clamping',
      now: '2025-02-28T00:00:00.000Z',
      startsAt: '2024-02-29T09:00:00.000Z',
    },
    {
      expected: {end: '2100-03-31', start: '2100-02-28'},
      name: 'a non-leap century',
      now: '2100-02-28T00:00:00.000Z',
      startsAt: '2000-01-31T09:00:00.000Z',
    },
    {
      expected: {end: '2027-01-31', start: '2026-12-31'},
      name: 'the December-to-January boundary',
      now: '2027-01-01T00:00:00.000Z',
      startsAt: '2026-12-31T09:00:00.000Z',
    },
    {
      expected: {end: '1999-02-28', start: '1999-01-31'},
      name: 'the existing two-digit-year UTC mapping',
      now: '0100-01-31T00:00:00.000Z',
      startsAt: '0099-01-31T09:00:00.000Z',
    },
    {
      expected: {end: '0100-02-28', start: '0100-01-31'},
      name: 'the existing transition out of two-digit years',
      now: '0100-01-31T00:00:00.000Z',
      startsAt: '0099-12-31T09:00:00.000Z',
    },
  ])('should preserve $name', ({startsAt, now, expected}) => {
    const subscriptionStart = new Date(startsAt)
    const observedAt = new Date(now)
    const timestamps = [subscriptionStart.getTime(), observedAt.getTime()]

    expect(getSubscriptionUsagePeriod(subscriptionStart, observedAt)).toEqual(expected)
    expect([subscriptionStart.getTime(), observedAt.getTime()]).toEqual(timestamps)
  })

  it.each([
    {endsAt: '2026-02-10T13:00:00.000Z', expected: '2026-02-10'},
    {endsAt: '2026-01-15T13:00:00.000Z', expected: '2026-01-15'},
    {endsAt: '2026-03-05T13:00:00.000Z', expected: '2026-02-28'},
    {endsAt: 'invalid', expected: '2026-02-28'},
  ])('should retain the entitlement cutoff $endsAt', ({endsAt, expected}) => {
    expect(
      getSubscriptionUsagePeriod(
        new Date('2026-01-31T09:00:00.000Z'),
        new Date('2026-02-01T00:00:00.000Z'),
        new Date(endsAt),
      ),
    ).toEqual({end: expected, start: '2026-01-31'})
  })

  it('should retain the first period for an invalid observation date', () => {
    expect(
      getSubscriptionUsagePeriod(new Date('2026-01-31T09:00:00.000Z'), new Date('invalid'), null),
    ).toEqual({end: '2026-02-28', start: '2026-01-31'})
  })

  it('should retain the invalid-start error', () => {
    expect(() =>
      getSubscriptionUsagePeriod(new Date('invalid'), new Date('2026-02-01T00:00:00.000Z')),
    ).toThrow(RangeError)
  })

  it('should retain renewal overflow at the Date limit', () => {
    expect(() =>
      getSubscriptionUsagePeriod(
        new Date('+275760-08-01T00:00:00.000Z'),
        new Date(8_640_000_000_000_000),
      ),
    ).toThrow(RangeError)
  })

  it('should reject an earlier observation before reading calendar fields', () => {
    const subscriptionStart = new Date('2026-01-31T09:00:00.000Z')
    const reads: Array<string> = []
    Object.defineProperty(subscriptionStart, 'getUTCMonth', {
      get() {
        reads.push('month')
        throw new Error('Calendar fields must not be read')
      },
    })

    expect(() =>
      getSubscriptionUsagePeriod(subscriptionStart, new Date('2026-01-31T08:59:59.999Z')),
    ).toThrow('Usage period cannot precede the subscription start')
    expect(reads).toEqual([])
  })

  it('should retain a custom calendar getter error by identity and read it once', () => {
    const subscriptionStart = new Date('2026-01-01T00:00:00.000Z')
    const failure = new Error('Custom month failed')
    const reads: Array<string> = []
    Object.defineProperty(subscriptionStart, 'getUTCMonth', {
      get() {
        reads.push('month')
        throw failure
      },
    })
    let observed: unknown
    try {
      getSubscriptionUsagePeriod(subscriptionStart, new Date('2026-02-01T00:00:00.000Z'))
    } catch (error: unknown) {
      observed = error
    }

    expect(observed).toBe(failure)
    expect(reads).toEqual(['month'])
  })

  it('should not read custom observation calendar getters', () => {
    const observedAt = new Date('2026-02-01T00:00:00.000Z')
    const reads: Array<string> = []
    Object.defineProperty(observedAt, 'getUTCFullYear', {
      get() {
        reads.push('year')
        throw new Error('Observation calendar getter must not be read')
      },
    })

    expect(getSubscriptionUsagePeriod(new Date('2026-01-01T00:00:00.000Z'), observedAt)).toEqual({
      end: '2026-03-01',
      start: '2026-02-01',
    })
    expect(reads).toEqual([])
  })

  it('should retain Date subclass coercion without reading its calendar overrides', () => {
    class ObservationDate extends Date {
      override getUTCFullYear(): number {
        throw new Error('Subclass calendar getter must not be read')
      }
    }

    expect(
      getSubscriptionUsagePeriod(
        new Date('2026-01-01T00:00:00.000Z'),
        new ObservationDate('2026-02-01T00:00:00.000Z'),
      ),
    ).toEqual({end: '2026-03-01', start: '2026-02-01'})
  })

  it('should retain Date proxy coercion without prototype inspection', () => {
    const coercions: Array<string> = []
    const inspect = vi.fn(() => {
      throw new Error('Prototype inspection is not supported')
    })
    const observedAt = new Proxy(new Date('2026-02-01T00:00:00.000Z'), {
      get(target, key) {
        if (key === Symbol.toPrimitive) {
          coercions.push('primitive')
          return Date.prototype[Symbol.toPrimitive].bind(target)
        }
        return Reflect.get(target, key, target)
      },
      getPrototypeOf: inspect,
    })

    expect(getSubscriptionUsagePeriod(new Date('2026-01-01T00:00:00.000Z'), observedAt)).toEqual({
      end: '2026-03-01',
      start: '2026-02-01',
    })
    expect(inspect).not.toHaveBeenCalled()
    expect(coercions).toEqual(['primitive', 'primitive', 'primitive'])
  })

  it('should bound calendar conversions independently of subscription age', () => {
    const utc = vi.spyOn(Date, 'UTC')
    try {
      expect(
        getSubscriptionUsagePeriod(
          new Date('2020-01-31T09:00:00.000Z'),
          new Date('2100-01-31T00:00:00.000Z'),
        ),
      ).toEqual({end: '2100-02-28', start: '2100-01-31'})
      expect(utc.mock.calls.length).toBeLessThanOrEqual(6)
    } finally {
      utc.mockRestore()
    }
  })
})
