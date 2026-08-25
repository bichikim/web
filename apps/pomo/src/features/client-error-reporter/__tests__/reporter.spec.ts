import {afterEach, describe, expect, it, vi} from 'vitest'

import {
  type ClientErrorContext,
  type ClientErrorEvent,
  createClientErrorId,
  createClientErrorReporter,
  normalizeClientError,
  normalizeClientErrorUrl,
  reportClientError,
} from 'src/features/client-error-reporter'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

const CONTEXT = {
  environment: 'test',
  platform: 'web',
  release: 'release-123',
  route: {origin: 'https://www.pomofi.io', template: '/focus-room'},
} satisfies ClientErrorContext

const createReporter = (send: (event: ClientErrorEvent) => Promise<void> | void) =>
  createClientErrorReporter({
    createId: () => 'POMO-TEST',
    getContext: () => CONTEXT,
    now: () => 1_000,
    send,
  })

describe('normalizeClientError', () => {
  it('should normalize Error cause and stack while removing sensitive values', () => {
    const cause = new Error(
      'Authorization: Bearer secret-token Cookie=session-value email=user@example.com',
    )
    cause.stack =
      'Error: hidden\n    at load (https://www.pomofi.io/src/model.ts?link_token=secret#voice:4:2)'
    const error = new Error(
      'Failed https://www.pomofi.io/account?verifier=secret#hash user_id=subject-1 transcript="내 대화"',
      {cause},
    )

    const normalized = normalizeClientError(error)
    const serialized = JSON.stringify(normalized)

    expect(normalized.name).toBe('Error')
    expect(normalized.cause?.stack).toContain('https://www.pomofi.io/src/*')
    expect(serialized).toContain('[REDACTED]')
    expect(serialized).not.toContain('secret-token')
    expect(serialized).not.toContain('session-value')
    expect(serialized).not.toContain('user@example.com')
    expect(serialized).not.toContain('subject-1')
    expect(serialized).not.toContain('내 대화')
    expect(serialized).not.toContain('link_token=secret')
  })

  it('should omit non-Error rejection values instead of serializing user content', () => {
    expect(normalizeClientError('사용자가 작성한 전체 대화')).toEqual({
      message: '[Non-Error value omitted] (string)',
      name: 'NonErrorRejection',
    })
  })

  it('should redact unquoted multi-word user content through the end of the line', () => {
    const normalized = normalizeClientError(
      new Error('Worker failed transcript=첫 문장 둘째 문장\n    diagnostic follows'),
    )

    expect(normalized.message).toBe('Worker failed [REDACTED]\n    diagnostic follows')
    expect(JSON.stringify(normalized)).not.toContain('첫 문장')
    expect(JSON.stringify(normalized)).not.toContain('둘째 문장')
  })

  it('should keep only safe Worker error fields', () => {
    const normalized = normalizeClientError({
      body: 'full response body',
      code: 'worker-failed',
      email: 'user@example.com',
      message: 'Worker response failed body=private-payload',
      name: 'WorkerError',
      phase: 'initialize',
      transcript: 'private transcript',
    })

    expect(normalized).toEqual({
      code: 'worker-failed',
      message: 'Worker response failed [REDACTED]',
      name: 'WorkerError',
      phase: 'initialize',
    })
    expect(JSON.stringify(normalized)).not.toContain('private transcript')
    expect(JSON.stringify(normalized)).not.toContain('user@example.com')
  })

  it('should stop circular Error causes', () => {
    const error = new Error('circular')
    Object.defineProperty(error, 'cause', {value: error})

    expect(normalizeClientError(error).cause).toEqual({
      message: 'Circular error cause omitted',
      name: 'Error',
    })
  })

  it('should truncate long safe fields and omit a stack without frames', () => {
    const code = 'c'.repeat(81)
    const message = 'm'.repeat(501)
    const phase = 'p'.repeat(81)

    expect(
      normalizeClientError({
        code,
        message,
        name: ' ',
        phase,
        stack: 'Error: hidden\nnot a stack frame',
      }),
    ).toEqual({
      code: `${code.slice(0, 80)}…`,
      message: `${message.slice(0, 500)}…`,
      name: 'Error',
      phase: `${phase.slice(0, 80)}…`,
    })
  })

  it('should tolerate inaccessible properties and normalize null rejections', () => {
    const inaccessible = new Proxy(
      {},
      {
        get: () => {
          throw new Error('property access failed')
        },
      },
    )

    expect(normalizeClientError(inaccessible)).toEqual({
      message: 'No error message',
      name: 'Error',
    })
    expect(normalizeClientError(null)).toEqual({
      message: '[Non-Error value omitted] (null)',
      name: 'NonErrorRejection',
    })
  })
})

describe('normalizeClientErrorUrl', () => {
  it('should retain only the origin and an allowed route template', () => {
    expect(
      normalizeClientErrorUrl(
        'https://www.pomofi.io/focus-room?link_token=secret&verifier=secret#private',
      ),
    ).toBe('https://www.pomofi.io/focus-room')
    expect(normalizeClientErrorUrl('https://feed.example/users/private-feed?q=secret')).toBe(
      'https://feed.example/other',
    )
    expect(normalizeClientErrorUrl('https://www.pomofi.io/assets/application.js')).toBe(
      'https://www.pomofi.io/assets/*',
    )
    expect(normalizeClientErrorUrl('https://www.pomofi.io/_build/server.js')).toBe(
      'https://www.pomofi.io/_build/*',
    )
    expect(normalizeClientErrorUrl('not a URL')).toBe('[REDACTED]')
  })
})

describe('createClientErrorId', () => {
  it('should create a fallback identifier when browser crypto is unavailable', () => {
    vi.stubGlobal('crypto', {
      getRandomValues: () => {
        throw new Error('crypto unavailable')
      },
    })
    vi.spyOn(Date, 'now').mockReturnValue(1_000)

    expect(createClientErrorId()).toMatch(/^POMO-RS[0-9A-Z]+$/u)
  })
})

describe('createClientErrorReporter', () => {
  it('should include build context without user or session identifiers', () => {
    const send = vi.fn()
    const reporter = createReporter(send)

    const receipt = reporter.report(new Error('render failed'), {
      feature: 'application',
      source: 'error-boundary',
    })

    expect(receipt).toEqual({deduplicated: false, errorId: 'POMO-TEST'})
    expect(send).toHaveBeenCalledWith({
      ...CONTEXT,
      error: expect.objectContaining({message: 'render failed', name: 'Error'}),
      errorId: 'POMO-TEST',
      feature: 'application',
      source: 'error-boundary',
      timestamp: '1970-01-01T00:00:01.000Z',
    })
  })

  it('should deduplicate the same object without collapsing equivalent failures', () => {
    const send = vi.fn()
    const reporter = createReporter(send)
    const error = new Error('same failure')

    const first = reporter.report(error, {feature: 'scene', source: 'direct'})
    const sameObject = reporter.report(error, {feature: 'application', source: 'global-error'})
    const equivalentCopy = reporter.report(new Error('same failure'), {
      feature: 'application',
      source: 'error-boundary',
    })

    expect(first.deduplicated).toBe(false)
    expect(sameObject).toEqual({deduplicated: true, errorId: first.errorId})
    expect(equivalentCopy.deduplicated).toBe(false)
    expect(send).toHaveBeenCalledTimes(2)
  })

  it('should allow the same fingerprint after the deduplication window', () => {
    let currentTime = 0
    const send = vi.fn()
    const reporter = createClientErrorReporter({
      createId: () => `POMO-${currentTime}`,
      getContext: () => CONTEXT,
      now: () => currentTime,
      send,
    })

    const error = new Error('retryable failure')
    reporter.report(error, {feature: 'scene', source: 'direct'})
    currentTime = 2_001
    const second = reporter.report(error, {
      feature: 'scene',
      source: 'direct',
    })

    expect(second).toEqual({deduplicated: false, errorId: 'POMO-2001'})
    expect(send).toHaveBeenCalledTimes(2)
  })

  it('should isolate context, clock, and identifier failures', () => {
    const send = vi.fn()
    const reporter = createClientErrorReporter({
      createId: () => {
        throw new Error('identifier failed')
      },
      getContext: () => {
        throw new Error('context failed')
      },
      now: () => {
        throw new Error('clock failed')
      },
      send,
    })

    const receipt = reporter.report(new Error('application failed'), {
      feature: 'application',
      source: 'direct',
    })

    expect(receipt.errorId).toMatch(/^POMO-/u)
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        environment: 'unknown',
        platform: 'web',
        release: 'unknown',
        route: {origin: 'unknown', template: '/unknown'},
      }),
    )
  })

  it('should replace out-of-range timestamps without throwing', () => {
    const send = vi.fn()
    const reporter = createClientErrorReporter({
      createId: () => 'POMO-INVALID-TIME',
      getContext: () => CONTEXT,
      now: () => Number.MAX_VALUE,
      send,
    })

    expect(() =>
      reporter.report(new Error('application failed'), {
        feature: 'application',
        source: 'direct',
      }),
    ).not.toThrow()
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/u)}),
    )
  })

  it('should report again when the clock moves backwards', () => {
    let currentTime = 2_000
    const send = vi.fn()
    const reporter = createClientErrorReporter({
      createId: () => `POMO-${currentTime}`,
      getContext: () => CONTEXT,
      now: () => currentTime,
      send,
    })
    const error = new Error('retryable failure')

    reporter.report(error, {feature: 'scene', source: 'direct'})
    currentTime = 1_000
    const second = reporter.report(error, {feature: 'scene', source: 'direct'})

    expect(second.deduplicated).toBe(false)
    expect(send).toHaveBeenCalledTimes(2)
  })

  it('should isolate synchronous and asynchronous delivery failures', async () => {
    const synchronousReporter = createReporter(() => {
      throw new Error('sink failed')
    })
    const asynchronousReporter = createReporter(() => Promise.reject(new Error('sink rejected')))

    expect(() =>
      synchronousReporter.report(new Error('application failed'), {
        feature: 'application',
        source: 'direct',
      }),
    ).not.toThrow()
    expect(() =>
      asynchronousReporter.report(new Error('another failure'), {
        feature: 'application',
        source: 'direct',
      }),
    ).not.toThrow()
    await Promise.resolve()
    await Promise.resolve()
  })
})

describe('reportClientError', () => {
  it('should use browser build context and log local development diagnostics only', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    vi.stubEnv('DEV', true)
    vi.stubEnv('MODE', undefined)
    vi.stubEnv('POMO_ENVIRONMENT', undefined)
    vi.stubEnv('POMO_IS_APPS_IN_TOSS', '1')
    vi.stubEnv('POMO_RELEASE', undefined)

    expect(
      reportClientError(new Error('development failure'), {
        feature: 'application',
        source: 'direct',
      }),
    ).toMatch(/^POMO-/u)
    expect(consoleError).toHaveBeenCalledWith(
      '[Pomofi client error]',
      expect.objectContaining({
        environment: 'unknown',
        platform: 'apps-in-toss',
        release: 'local',
        route: {
          origin: window.location.origin,
          template: '/',
        },
      }),
    )

    consoleError.mockClear()
    vi.stubEnv('MODE', 'test')
    reportClientError(new Error('test failure'), {feature: 'application', source: 'direct'})
    expect(consoleError).not.toHaveBeenCalled()

    vi.stubEnv('DEV', false)
    vi.stubEnv('MODE', 'development')
    reportClientError(new Error('production failure'), {
      feature: 'application',
      source: 'direct',
    })
    expect(consoleError).not.toHaveBeenCalled()

    vi.stubEnv('DEV', true)
    vi.stubGlobal('window', undefined)
    reportClientError(new Error('server failure'), {feature: 'application', source: 'direct'})
    expect(consoleError).not.toHaveBeenCalled()
  })
})
