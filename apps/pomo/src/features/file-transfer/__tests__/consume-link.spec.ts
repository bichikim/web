import {describe, expect, it} from 'vitest'
import {consumeTransferLink} from '../consume-link'

const location = {hash: '#example%2Ffragment', isConfigured: true, pathname: '/tools'}

describe('consumeTransferLink', () => {
  it.each(['', '?session=example', '?tool=other&session=example', '?tool=&tool=transfer'])(
    'should ignore a link whose first tool value is not transfer: %s',
    (search) => {
      expect(consumeTransferLink({...location, search})).toBeNull()
    },
  )

  it('should ignore transfer links when the runtime is not configured', () => {
    expect(
      consumeTransferLink({...location, isConfigured: false, search: '?tool=transfer&session=x'}),
    ).toBeNull()
  })

  it('should consume every invitation key while retaining repeated unrelated parameters', () => {
    expect(
      consumeTransferLink({
        ...location,
        search: '?tool=transfer&session=first&keep=a&tool=other&session=second&keep=b',
      }),
    ).toEqual({
      replacementUrl: '/tools?keep=a&keep=b',
      secret: 'example%2Ffragment',
      sessionId: 'first',
    })
  })

  it('should decode query values and serialize retained parameters using URLSearchParams', () => {
    expect(
      consumeTransferLink({
        ...location,
        search: '?tool=%74ransfer&session=a%2Fb+c&keep=a%20b&encoded=%26%3D',
      }),
    ).toEqual({
      replacementUrl: '/tools?keep=a+b&encoded=%26%3D',
      secret: 'example%2Ffragment',
      sessionId: 'a/b c',
    })
  })

  it('should retain the fragment when opening the tool without an invitation', () => {
    expect(consumeTransferLink({...location, search: '?tool=transfer'})).toEqual({
      replacementUrl: '/tools#example%2Ffragment',
      secret: 'example%2Ffragment',
      sessionId: null,
    })
  })

  it.each(['?tool=transfer&session', '?tool=transfer&session='])(
    'should treat an empty session as an invitation and consume the fragment: %s',
    (search) => {
      expect(consumeTransferLink({...location, search})).toEqual({
        replacementUrl: '/tools',
        secret: 'example%2Ffragment',
        sessionId: '',
      })
    },
  )

  it('should preserve missing secrets and tolerate malformed query encoding', () => {
    expect(
      consumeTransferLink({...location, hash: '', search: '?tool=transfer&session=%&keep=%'}),
    ).toEqual({replacementUrl: '/tools?keep=%25', secret: '', sessionId: '%'})
  })

  it('should leave its input unchanged and make the consumed URL inert', () => {
    const input = Object.freeze({...location, search: '?tool=transfer&session=x&keep=1'})
    const result = consumeTransferLink(input)!
    const consumed = new URL(result.replacementUrl, 'https://example.test')
    expect(input.search).toBe('?tool=transfer&session=x&keep=1')
    expect(
      consumeTransferLink({
        hash: consumed.hash,
        isConfigured: true,
        pathname: consumed.pathname,
        search: consumed.search,
      }),
    ).toBeNull()
  })
})
