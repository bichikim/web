import {readFileSync} from 'node:fs'
import {createRequire} from 'node:module'
import {describe, expect, it} from 'vitest'

import {
  createRemoteServerFunctionsPlugin,
  transformRemoteServerFunctions,
} from '../remote-server-functions'

const require = createRequire(import.meta.url)
const CLIENT_RUNTIME_PATH = require.resolve('@solidjs/start/fns/client')

describe('transformRemoteServerFunctions', () => {
  it('should point the installed SolidStart client runtime at the remote SSR origin', () => {
    const source = readFileSync(CLIENT_RUNTIME_PATH, 'utf8')

    const transformed = transformRemoteServerFunctions(source, 'https://ssr.pomofi.example/path')

    expect(transformed).toContain('let baseURL = "https://ssr.pomofi.example/";')
    expect(transformed).toMatch(/\$\{baseURL\}_server/u)
    expect(transformed).not.toContain('let baseURL = import.meta.env.BASE_URL ?? "/";')
  })

  it('should reject an unexpected SolidStart client runtime', () => {
    expect(() => transformRemoteServerFunctions('export {}', 'https://ssr.pomofi.example')).toThrow(
      'Expected one SolidStart server-function base URL declaration, found 0.',
    )
  })
})

describe('createRemoteServerFunctionsPlugin', () => {
  it('should create a build-only pre-transform for the supported installed version', () => {
    const plugin = createRemoteServerFunctionsPlugin({publicOrigin: 'https://ssr.pomofi.example'})

    expect(plugin).toMatchObject({
      apply: 'build',
      enforce: 'pre',
      name: 'pomo:remote-server-functions',
    })
  })
})
