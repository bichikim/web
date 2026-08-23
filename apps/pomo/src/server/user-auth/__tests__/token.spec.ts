import {describe, expect, it} from 'vitest'

import {createOpaqueToken, hashOpaqueToken, readBearerToken} from '../token'

describe('opaque tokens', () => {
  it('should create URL-safe random tokens with stable hashes', () => {
    const firstToken = createOpaqueToken()
    const secondToken = createOpaqueToken()

    expect(firstToken).toMatch(/^[\w-]+$/u)
    expect(firstToken).not.toBe(secondToken)
    expect(hashOpaqueToken(firstToken)).toHaveLength(64)
    expect(hashOpaqueToken(firstToken)).toBe(hashOpaqueToken(firstToken))
  })

  it('should read only non-empty bearer credentials', () => {
    expect(readBearerToken(new Request('https://pomo.example'))).toBeNull()
    expect(
      readBearerToken(
        new Request('https://pomo.example', {headers: {Authorization: 'Basic credential'}}),
      ),
    ).toBeNull()
    expect(
      readBearerToken(new Request('https://pomo.example', {headers: {Authorization: 'Bearer '}})),
    ).toBeNull()
    expect(
      readBearerToken(
        new Request('https://pomo.example', {headers: {Authorization: 'Bearer app-token'}}),
      ),
    ).toBe('app-token')
  })
})
