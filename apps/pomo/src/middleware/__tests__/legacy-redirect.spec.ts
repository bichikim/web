/** @vitest-environment node */
import {describe, expect, it} from 'vitest'

import {handleLegacyRedirectRequest} from '../legacy-redirect'

describe('handleLegacyRedirectRequest', () => {
  it.each([
    ['/focus-room', '/'],
    ['/focus-room/', '/'],
    ['/focus-room-dialogue', '/dialogue'],
    ['/focus-room-dialogue/', '/dialogue'],
    ['/privacy', '/web/privacy'],
    ['/privacy/', '/web/privacy'],
    ['/terms', '/web/terms'],
    ['/terms/', '/web/terms'],
  ])('should permanently redirect %s to %s', (pathname, location) => {
    const response = handleLegacyRedirectRequest(new Request(`https://pomo.example${pathname}`))

    expect(response?.status).toBe(308)
    expect(response?.headers.get('Location')).toBe(location)
  })

  it.each(['/focus-room', '/focus-room/'])(
    'should preserve the complete focus room query string for %s',
    (pathname) => {
      const response = handleLegacyRedirectRequest(
        new Request(`https://pomo.example${pathname}?link_token=secret&verifier=secret`),
      )

      expect(response?.headers.get('Location')).toBe(
        '/?link_token=secret&verifier=secret',
      )
    },
  )

  it('should preserve the complete dialogue query string', () => {
    const response = handleLegacyRedirectRequest(
      new Request('https://pomo.example/focus-room-dialogue/?dialogueId=a%20b&mode=edit'),
    )

    expect(response?.headers.get('Location')).toBe('/dialogue?dialogueId=a%20b&mode=edit')
  })

  it('should ignore a non-legacy path', () => {
    expect(
      handleLegacyRedirectRequest(new Request('https://pomo.example/dialogue?dialogueId=saved')),
    ).toBeNull()
  })
})
