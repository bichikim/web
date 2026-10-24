/** @vitest-environment node */
import {resolve} from 'node:path'
import {describe, expect, it} from 'vitest'
import {resolvePreviousSource} from '../resolve-previous-source'

const options = {marketplace: 'example-plugins', plugin: 'viewer', root: '/codex/marketplace'}
const catalog = (path: string, source = 'local') =>
  JSON.stringify({
    name: options.marketplace,
    plugins: [{name: options.plugin, source: {path, source}}],
  })

describe('resolvePreviousSource', () => {
  it.each(['1.2.3-abcdef', '2.0.0-rc.1+build.2-ABC123'])(
    'should resolve the owned source directory %s',
    (directory) => {
      expect(resolvePreviousSource({...options, catalog: catalog(`./plugins/${directory}`)})).toBe(
        resolve(options.root, 'plugins', directory),
      )
    },
  )

  it.each([
    './plugins/../../outside-abcdef',
    '/elsewhere/1.2.3-abcdef',
    './plugins/personal-files',
    './plugins/1.2.3-abcdef/nested',
    './plugins/..\\outside-abcdef',
  ])('should leave non-owned path %s alone', (path) => {
    expect(resolvePreviousSource({...options, catalog: catalog(path)})).toBeUndefined()
  })

  it.each(['marketplace', 'plugin'])('should leave sources from another %s alone', (field) => {
    expect(
      resolvePreviousSource({
        ...options,
        catalog: catalog('./plugins/1.2.3-abcdef'),
        [field]: 'other',
      }),
    ).toBeUndefined()
  })

  it.each([null, '{broken', catalog('./plugins/1.2.3-abcdef', 'npm')])(
    'should ignore missing, malformed or npm catalogs',
    (text) => {
      expect(resolvePreviousSource({...options, catalog: text})).toBeUndefined()
    },
  )
})
