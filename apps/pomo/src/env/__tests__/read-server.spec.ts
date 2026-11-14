/** @vitest-environment node */
import {afterEach, describe, expect, it, vi} from 'vitest'

import {readServerEnv, throwEnvError} from '../read-server'
import {envSchema, requiredStringSchema} from '../schema'

const fooSchema = {FOO: requiredStringSchema('FOO')}

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('readServerEnv', () => {
  it('should parse the supplied runtime environment', () => {
    expect(readServerEnv(fooSchema, {FOO: '  bar  '})).toEqual({FOO: 'bar'})
  })

  it('should read the process environment when no runtime snapshot is provided', () => {
    vi.stubEnv('FOO', 'from-process')

    expect(readServerEnv(fooSchema)).toEqual({FOO: 'from-process'})
  })

  it('should throw the first validation issue as a TypeError', () => {
    expect(() => readServerEnv(fooSchema, {FOO: ''})).toThrow(TypeError)
    expect(() => readServerEnv(fooSchema, {FOO: ''})).toThrow('FOO is not set')
  })

  it('should preserve omitted and explicit optional URL values in the parsed environment', () => {
    const parsed = readServerEnv(
      {
        DATABASE_URL_UNPOOLED: envSchema.DATABASE_URL_UNPOOLED,
        POMO_AI_RUNNER_URL: envSchema.POMO_AI_RUNNER_URL,
      },
      {DATABASE_URL_UNPOOLED: '  ', POMO_AI_RUNNER_URL: ' HTTPS://RUNNER.example.test:443/path '},
    )

    expect(parsed).toEqual({
      DATABASE_URL_UNPOOLED: undefined,
      POMO_AI_RUNNER_URL: 'HTTPS://RUNNER.example.test:443/path',
    })
  })

  it('should preserve optional URL issue paths and order as the TypeError cause', () => {
    expect(() =>
      readServerEnv(
        {
          DATABASE_URL_UNPOOLED: envSchema.DATABASE_URL_UNPOOLED,
          POMO_AI_RUNNER_URL: envSchema.POMO_AI_RUNNER_URL,
        },
        {DATABASE_URL_UNPOOLED: 'not-a-url', POMO_AI_RUNNER_URL: 'http://runner.example.test/'},
      ),
    ).toThrowError(
      expect.objectContaining({
        cause: [
          {
            code: 'custom',
            message: 'DATABASE_URL_UNPOOLED must be a valid URL',
            path: ['DATABASE_URL_UNPOOLED'],
          },
          {
            code: 'custom',
            message: 'POMO_AI_RUNNER_URL must use https:',
            path: ['POMO_AI_RUNNER_URL'],
          },
        ],
        message: 'DATABASE_URL_UNPOOLED must be a valid URL',
        name: 'TypeError',
      }),
    )
  })
})

describe('throwEnvError', () => {
  it('should throw Invalid environment when no issues are present', () => {
    expect(() => throwEnvError([])).toThrow('Invalid environment')
  })
})
