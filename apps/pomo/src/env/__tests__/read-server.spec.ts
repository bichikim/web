import {afterEach, describe, expect, it, vi} from 'vitest'

import {readServerEnv, throwEnvError} from '../read-server'
import {requiredStringSchema} from '../schema'

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
})

describe('throwEnvError', () => {
  it('should throw Invalid environment when no issues are present', () => {
    expect(() => throwEnvError([])).toThrow('Invalid environment')
  })
})
