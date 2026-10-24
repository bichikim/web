import {describe, expect, it} from 'vitest'

import {assertPublishableDependencies} from '../archive.mjs'

describe('assertPublishableDependencies', () => {
  it('should accept registry versions in every dependency section', () => {
    expect(() =>
      assertPublishableDependencies({
        dependencies: {zod: '^4.4.2'},
        devDependencies: {vite: '8.1.5'},
        optionalDependencies: {sharp: '^0.34.0'},
        peerDependencies: {typescript: '>=5'},
      }),
    ).not.toThrow()
  })

  it.each(['catalog:', 'workspace:*'])(
    'should reject the non-publishable %s protocol',
    (version) => {
      expect(() => assertPublishableDependencies({dependencies: {dependency: version}})).toThrow(
        `dependency@${version}`,
      )
    },
  )

  it('should validate development dependencies included in the archive manifest', () => {
    expect(() =>
      assertPublishableDependencies({devDependencies: {typescript: 'catalog:'}}),
    ).toThrow('typescript@catalog:')
  })
})
