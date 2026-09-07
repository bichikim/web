import {describe, expect, it} from 'vitest'

import {resolvePublicOrigin} from '../public-origin'

describe('resolvePublicOrigin', () => {
  it('should use the production origin when the environment value is absent', () => {
    expect(resolvePublicOrigin({})).toBe('https://www.pomofi.io')
  })

  it('should normalize an environment URL to its origin', () => {
    expect(
      resolvePublicOrigin({POMO_PUBLIC_ORIGIN: ' https://preview.pomofi.example/path?q=1 '}),
    ).toBe('https://preview.pomofi.example')
  })

  it.each(['not-a-url', 'file:///tmp/pomo', 'data:text/plain,pomo'])(
    'should reject the unsupported public origin %s',
    (publicOrigin) => {
      expect(() => resolvePublicOrigin({POMO_PUBLIC_ORIGIN: publicOrigin})).toThrow(
        'POMO_PUBLIC_ORIGIN must be an absolute HTTP or HTTPS URL.',
      )
    },
  )
})
