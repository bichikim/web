import {describe, expect, it} from 'vitest'

import {readServerConfig} from '../server-config.js'

describe('readServerConfig', () => {
  it('should use local development defaults when settings are omitted', () => {
    expect(readServerConfig({})).toEqual({
      host: '0.0.0.0',
      nodeEnvironment: 'development',
      port: 3000,
    })
  })

  it('should parse explicitly configured settings', () => {
    expect(
      readServerConfig({
        HOST: '127.0.0.1',
        NODE_ENV: 'production',
        PORT: '8080',
      }),
    ).toEqual({
      host: '127.0.0.1',
      nodeEnvironment: 'production',
      port: 8080,
    })
  })

  it('should treat empty settings as omitted without mutating the source', () => {
    const environment = {PORT: ''}

    expect(readServerConfig(environment).port).toBe(3000)
    expect(environment).toEqual({PORT: ''})
  })

  it.each(['0', '65536', 'not-a-port'])('should reject invalid port %s', (port) => {
    expect(() => readServerConfig({PORT: port})).toThrowError('Invalid server configuration')
  })

  it('should reject a blank host', () => {
    expect(() => readServerConfig({HOST: '  '})).toThrowError('Invalid server configuration')
  })

  it('should reject an unsupported environment', () => {
    expect(() => readServerConfig({NODE_ENV: 'preview'})).toThrowError(
      'Invalid server configuration',
    )
  })
})
