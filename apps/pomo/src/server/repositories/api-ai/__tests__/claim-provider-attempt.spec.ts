import {afterEach, describe, expect, it, vi} from 'vitest'

import {apiAiAttempts, apiAiJobs, apiAiPools} from 'src/server/database'
import {claimProviderAttempt} from '../claim-provider-attempt'

vi.mock('src/server/database', async () => {
  const schema = await vi.importActual<typeof import('src/server/database/schema/api-ai')>(
    'src/server/database/schema/api-ai',
  )
  return {
    apiAiAttempts: schema.apiAiAttempts,
    apiAiCallbacks: schema.apiAiCallbacks,
    apiAiJobs: schema.apiAiJobs,
    apiAiPools: schema.apiAiPools,
  }
})

type ClaimInput = Parameters<typeof claimProviderAttempt>[0]

const createClaim = (body: Readonly<Record<string, unknown>>) => {
  const trace: string[] = []
  const job = {body, id: 'job', kind: 'cloud-text'} as ClaimInput['job']
  const provider = {
    id: 'provider',
    models: {'cloud-text': 'model'},
    poolId: 'pool',
  } as ClaimInput['provider']
  const attempt = {id: 'attempt'}
  const claimed = {...job, activeAttemptId: attempt.id}
  const poolWrite = vi.fn(async () => {
    trace.push('pool')
  })
  const attemptWrite = vi.fn(async () => {
    trace.push('attempt')
    return [attempt]
  })
  const jobWrite = vi.fn(async () => {
    trace.push('job')
    return [claimed]
  })
  const attemptValues = vi.fn((_values: Readonly<Record<string, unknown>>) => ({
    returning: attemptWrite,
  }))
  const jobValues = vi.fn((_values: Readonly<Record<string, unknown>>) => ({
    where: vi.fn(() => ({returning: jobWrite})),
  }))
  const insert = vi.fn((table: unknown) => {
    if (table === apiAiPools) {
      return {values: vi.fn(() => ({onConflictDoNothing: poolWrite}))}
    }
    expect(table).toBe(apiAiAttempts)
    return {values: attemptValues}
  })
  const update = vi.fn((table: unknown) => {
    expect(table).toBe(apiAiJobs)
    return {set: jobValues}
  })
  const input: ClaimInput = {
    attemptId: attempt.id,
    deadline: new Date('2026-11-15T12:30:00Z'),
    job,
    now: new Date('2026-11-15T12:00:00Z'),
    provider,
    transaction: {insert, update} as unknown as ClaimInput['transaction'],
  }
  return {
    attempt,
    attemptValues,
    attemptWrite,
    claimed,
    input,
    jobValues,
    jobWrite,
    poolWrite,
    trace,
  }
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('claimProviderAttempt', () => {
  it.each([
    ['', 1],
    ['ASCII text', 17],
    ['한글 日本語', 64],
    ['😀👨‍👩‍👧‍👦', 128],
    ['e\u0301\u0000\n"\\', 256],
    ['\ud800x\udfff', Number.MAX_SAFE_INTEGER],
  ])(
    'should reserve serialized UTF-8 bytes plus the original token limit for %j',
    async (text, limit) => {
      const body = {input: [{content: text, role: 'user'}], max_output_tokens: limit}
      const expected = new TextEncoder().encode(JSON.stringify(body)).length + limit
      const claim = createClaim(body)

      const result = await claimProviderAttempt(claim.input)

      expect(claim.attemptValues).toHaveBeenCalledExactlyOnceWith({
        createdAt: claim.input.now,
        deadlineAt: claim.input.deadline,
        id: 'attempt',
        jobId: 'job',
        modelId: 'model',
        poolId: 'pool',
        providerId: 'provider',
        state: 'submitting',
        tokenReservation: expected,
      })
      expect(claim.jobValues).toHaveBeenCalledExactlyOnceWith({
        activeAttemptId: 'attempt',
        executionExpiresAt: claim.input.deadline,
        status: 'submitting',
      })
      expect(result.attempt).toBe(claim.attempt)
      expect(result.job).toBe(claim.claimed)
      expect(result.provider).toBe(claim.input.provider)
      expect(claim.trace).toEqual(['pool', 'attempt', 'job'])
    },
  )

  it('should use the first token getter value while serializing the body only once', async () => {
    let reads = 0
    const body = {
      get max_output_tokens() {
        reads += 1
        return reads === 1 ? 100 : 200
      },
      get text() {
        claim.trace.push('serialize')
        return '한글'
      },
    }
    const claim = createClaim(body)
    const expected =
      new TextEncoder().encode('{"max_output_tokens":200,"text":"한글"}').length + 100

    await claimProviderAttempt(claim.input)

    expect(reads).toBe(2)
    expect(claim.attemptValues.mock.calls[0][0].tokenReservation).toBe(expected)
    expect(claim.trace).toEqual(['pool', 'serialize', 'attempt', 'job'])
  })

  it('should preserve the empty model fallback for an unmapped job kind', async () => {
    const claim = createClaim({max_output_tokens: 12})
    const provider = {...claim.input.provider, models: {}}

    await claimProviderAttempt({...claim.input, provider})

    expect(claim.attemptValues.mock.calls[0][0].modelId).toBe('')
  })

  it('should wait for the pool write before reading or serializing the body', async () => {
    const pool = Promise.withResolvers<void>()
    const read = vi.fn(() => 12)
    const claim = createClaim({
      get max_output_tokens() {
        return read()
      },
    })
    claim.poolWrite.mockImplementationOnce(() => pool.promise)

    const operation = claimProviderAttempt(claim.input)
    try {
      expect(read).not.toHaveBeenCalled()
      expect(claim.attemptValues).not.toHaveBeenCalled()
    } finally {
      pool.resolve()
    }
    await operation

    expect(read).toHaveBeenCalledTimes(2)
    expect(claim.trace).toEqual(['attempt', 'job'])
  })

  it.each([undefined, null, '10', 0, -1, 1.5, Number.NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])(
    'should reject invalid token limits before serialization or attempt writes: %j',
    async (limit) => {
      const serialized = vi.fn()
      const claim = createClaim({max_output_tokens: limit, toJSON: serialized})

      await expect(claimProviderAttempt(claim.input)).rejects.toThrow(
        'Queued AI requests require a bounded output token count',
      )

      expect(serialized).not.toHaveBeenCalled()
      expect(claim.attemptValues).not.toHaveBeenCalled()
      expect(claim.trace).toEqual(['pool'])
    },
  )

  it('should retain empty encoding when toJSON returns undefined', async () => {
    const serialize = vi.fn(() => undefined)
    const claim = createClaim({max_output_tokens: 12, toJSON: serialize})

    await claimProviderAttempt(claim.input)

    expect(serialize).toHaveBeenCalledOnce()
    expect(claim.attemptValues.mock.calls[0][0].tokenReservation).toBe(12)
  })

  it('should preserve serialization failure identity after the pool write', async () => {
    const failure = new Error('serialization')
    const claim = createClaim({
      max_output_tokens: 12,
      toJSON() {
        claim.trace.push('serialize')
        throw failure
      },
    })

    await expect(claimProviderAttempt(claim.input)).rejects.toBe(failure)

    expect(claim.trace).toEqual(['pool', 'serialize'])
    expect(claim.attemptValues).not.toHaveBeenCalled()
  })

  it('should preserve token getter failure identity before serialization', async () => {
    const failure = new Error('token getter')
    const serialize = vi.fn()
    const claim = createClaim({
      get max_output_tokens() {
        throw failure
      },
      toJSON: serialize,
    })

    await expect(claimProviderAttempt(claim.input)).rejects.toBe(failure)

    expect(serialize).not.toHaveBeenCalled()
    expect(claim.trace).toEqual(['pool'])
  })

  it.each([null, '한글😀', 42, false, {text: '😀'}])(
    'should count the serialized toJSON result rather than the original object: %j',
    async (value) => {
      const claim = createClaim({max_output_tokens: 12, toJSON: () => value})
      const expected = new TextEncoder().encode(JSON.stringify(value)).length + 12

      await claimProviderAttempt(claim.input)

      expect(claim.attemptValues.mock.calls[0][0].tokenReservation).toBe(expected)
    },
  )

  it.each([
    () => ({max_output_tokens: 12, value: 1n}),
    () => {
      const body: Record<string, unknown> = {max_output_tokens: 12}
      body.self = body
      return body
    },
  ])('should preserve JSON serialization rejection before attempt writes', async (createBody) => {
    const claim = createClaim(createBody())

    await expect(claimProviderAttempt(claim.input)).rejects.toBeInstanceOf(TypeError)

    expect(claim.trace).toEqual(['pool'])
    expect(claim.attemptValues).not.toHaveBeenCalled()
  })

  it('should preserve JSON property getter failure identity', async () => {
    const failure = new Error('JSON property')
    const claim = createClaim({
      max_output_tokens: 12,
      get value() {
        throw failure
      },
    })

    await expect(claimProviderAttempt(claim.input)).rejects.toBe(failure)

    expect(claim.trace).toEqual(['pool'])
    expect(claim.attemptValues).not.toHaveBeenCalled()
  })

  it('should keep reentrant claims and their reservation values independent', async () => {
    const inner = createClaim({input: 'inner', max_output_tokens: 2})
    let nested: ReturnType<typeof claimProviderAttempt> | undefined
    const outer = createClaim({
      max_output_tokens: 10,
      toJSON() {
        nested = claimProviderAttempt(inner.input)
        return {input: 'outer'}
      },
    })

    await claimProviderAttempt(outer.input)
    await expect(nested).resolves.toMatchObject({attempt: inner.attempt, job: inner.claimed})

    expect(outer.attemptValues.mock.calls[0][0].tokenReservation).toBe(
      new TextEncoder().encode('{"input":"outer"}').length + 10,
    )
    expect(inner.attemptValues.mock.calls[0][0].tokenReservation).toBe(
      new TextEncoder().encode('{"input":"inner","max_output_tokens":2}').length + 2,
    )
  })

  it('should stop before reading the body if the pool write fails', async () => {
    const failure = new Error('pool')
    const read = vi.fn(() => 12)
    const claim = createClaim({
      get max_output_tokens() {
        return read()
      },
    })
    claim.poolWrite.mockRejectedValueOnce(failure)

    await expect(claimProviderAttempt(claim.input)).rejects.toBe(failure)

    expect(read).not.toHaveBeenCalled()
    expect(claim.attemptValues).not.toHaveBeenCalled()
  })

  it('should stop before updating the job when the attempt write fails', async () => {
    const failure = new Error('attempt')
    const claim = createClaim({max_output_tokens: 12})
    claim.attemptWrite.mockRejectedValueOnce(failure)

    await expect(claimProviderAttempt(claim.input)).rejects.toBe(failure)

    expect(claim.jobValues).not.toHaveBeenCalled()
  })

  it('should preserve the job write failure identity', async () => {
    const failure = new Error('job')
    const claim = createClaim({max_output_tokens: 12})
    claim.jobWrite.mockRejectedValueOnce(failure)

    await expect(claimProviderAttempt(claim.input)).rejects.toBe(failure)

    expect(claim.attemptWrite).toHaveBeenCalledOnce()
    expect(claim.jobWrite).toHaveBeenCalledOnce()
  })

  it('should count a large body without materializing an encoded byte array', async () => {
    const body = {input: '한글😀'.repeat(65_536), max_output_tokens: 100}
    const expected = new TextEncoder().encode(JSON.stringify(body)).length + 100
    const claim = createClaim(body)
    const encode = vi.spyOn(TextEncoder.prototype, 'encode')

    await claimProviderAttempt(claim.input)

    expect(claim.attemptValues.mock.calls[0][0].tokenReservation).toBe(expected)
    expect(encode.mock.calls.length).toBe(0)
  })
})
