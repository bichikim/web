import {createRoot} from 'solid-js'
import {describe, expect, it} from 'vitest'

import {createAuthenticationMachine, transitionAuthentication} from '../machine'

describe('transitionAuthentication', () => {
  it('should resolve every authentication session kind', () => {
    expect(transitionAuthentication({kind: 'checking'}, {type: 'resolve-anonymous'})).toEqual({
      kind: 'anonymous',
    })
    expect(
      transitionAuthentication(
        {kind: 'checking'},
        {
          session: {email: 'user@example.com', kind: 'authenticated', provider: 'email'},
          type: 'resolve-authenticated',
        },
      ),
    ).toEqual({email: 'user@example.com', kind: 'authenticated', provider: 'email'})
    expect(transitionAuthentication({kind: 'checking'}, {type: 'resolve-unavailable'})).toEqual({
      kind: 'unavailable',
    })
  })

  it('should start a fresh check from any session state', () => {
    expect(transitionAuthentication({kind: 'anonymous'}, {type: 'check'})).toEqual({
      kind: 'checking',
    })
  })

  it('should sign out only an authenticated session', () => {
    expect(
      transitionAuthentication({kind: 'authenticated', provider: 'toss'}, {type: 'sign-out'}),
    ).toEqual({kind: 'anonymous'})
    expect(transitionAuthentication({kind: 'unavailable'}, {type: 'sign-out'})).toEqual({
      kind: 'unavailable',
    })
  })
})

describe('createAuthenticationMachine', () => {
  it('should expose reactive transitions through one session machine', () => {
    createRoot((dispose) => {
      const authentication = createAuthenticationMachine({kind: 'anonymous'})

      authentication.send({type: 'check'})
      expect(authentication.state()).toEqual({kind: 'checking'})

      authentication.send({
        session: {kind: 'authenticated', provider: 'toss'},
        type: 'resolve-authenticated',
      })
      expect(authentication.state()).toEqual({kind: 'authenticated', provider: 'toss'})

      dispose()
    })
  })
})
