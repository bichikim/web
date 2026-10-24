/** @vitest-environment node */
import {createHash} from 'node:crypto'
import {expect, it} from 'vitest'

import {createCodeChallenge} from '../create-code-challenge'

it('should create a PKCE S256 challenge from the verifier', () => {
  expect(createCodeChallenge('verifier')).toBe(
    createHash('sha256').update('verifier').digest('base64url'),
  )
})
