import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {createLogger, type LoggerOptions} from '../logging'

describe('createLogger', () => {
  const fetchMock = vi.fn<typeof fetch>()
  const notifyClients = vi.fn<(message: Record<string, unknown>) => Promise<void>>()

  const createOptions = (overrides: Partial<LoggerOptions> = {}): LoggerOptions => ({
    cacheVersion: 3,
    environment: 'production',
    logLevel: 'info',
    logSampleRate: 1,
    notifyClients,
    ...overrides,
  })

  beforeEach(() => {
    vi.clearAllMocks()
    fetchMock.mockResolvedValue(new Response())
    notifyClients.mockResolvedValue(undefined)
    vi.stubGlobal('fetch', fetchMock)
    vi.spyOn(console, 'debug').mockImplementation(() => undefined)
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    vi.spyOn(console, 'info').mockImplementation(() => undefined)
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('should suppress messages below the configured level', () => {
    const log = createLogger(createOptions({logLevel: 'warn'}))

    log('info', 'hidden')
    log('warn', 'visible')

    expect(console.info).not.toHaveBeenCalled()
    expect(console.warn).toHaveBeenCalledWith('visible', undefined)
  })

  it('should suppress all output for the silent level', () => {
    const log = createLogger(createOptions({logLevel: 'silent'}))

    log('error', 'hidden')

    expect(console.error).not.toHaveBeenCalled()
    expect(notifyClients).not.toHaveBeenCalled()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('should skip a sampled-out message', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const log = createLogger(createOptions({logSampleRate: 0.5}))

    log('info', 'sampled out')

    expect(console.info).not.toHaveBeenCalled()
  })

  it('should route info and debug messages to their console methods', () => {
    const log = createLogger(createOptions({logLevel: 'debug'}))

    log('info', 'information')
    log('debug', 'diagnostic')

    expect(console.info).toHaveBeenCalledWith('information', undefined)
    expect(console.debug).toHaveBeenCalledWith('diagnostic', undefined)
  })

  it('should notify development clients and post endpoint logs', () => {
    const log = createLogger(
      createOptions({
        environment: 'development',
        logEndpoint: 'https://logs.example.com/sw',
      }),
    )

    log('error', 'failure', {requestId: 'request-1'})

    expect(notifyClients).toHaveBeenCalledWith({
      payload: expect.objectContaining({
        cacheVersion: 3,
        details: {requestId: 'request-1'},
        level: 'error',
        message: 'failure',
      }),
      type: 'SW_LOG',
    })
    expect(fetchMock).toHaveBeenCalledWith(
      'https://logs.example.com/sw',
      expect.objectContaining({method: 'POST'}),
    )
  })

  it('should absorb client and endpoint logging failures', async () => {
    notifyClients.mockRejectedValue(new Error('client unavailable'))
    fetchMock.mockRejectedValue(new Error('endpoint unavailable'))
    const log = createLogger(
      createOptions({environment: 'development', logEndpoint: 'https://logs.example.com/sw'}),
    )

    expect(() => log('error', 'failure')).not.toThrow()
    await Promise.resolve()

    expect(notifyClients).toHaveBeenCalledOnce()
    expect(fetchMock).toHaveBeenCalledOnce()
  })
})
