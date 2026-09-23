/** @vitest-environment node */
import {describe, expect, it} from 'vitest'

import {createOpaqueToken, hashOpaqueToken} from '..'

describe('opaque tokens', () => {
  it('should create URL-safe random tokens with stable hashes', () => {
    const firstToken = createOpaqueToken()
    const secondToken = createOpaqueToken()

    expect(firstToken).toMatch(/^[\w-]+$/u)
    expect(firstToken).not.toBe(secondToken)
    expect(hashOpaqueToken(firstToken)).toHaveLength(64)
    expect(hashOpaqueToken(firstToken)).toBe(hashOpaqueToken(firstToken))
  })
})
