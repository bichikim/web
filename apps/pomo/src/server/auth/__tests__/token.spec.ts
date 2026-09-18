/** @vitest-environment node */
import {describe, expect, it} from 'vitest'

import {readBearerToken} from '../token'

describe('readBearerToken', () => {
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

  it('should reject an empty bearer credential from a request adapter', () => {
    const request = {
      headers: {get: () => 'Bearer '},
    } as unknown as Request

    expect(readBearerToken(request)).toBeNull()
  })
})
