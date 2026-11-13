/** @vitest-environment node */
import {describe, expect, it} from 'vitest'
import {failureResult, successResult} from '@winter-love/supertonic/result'

describe('Supertonic Result', () => {
  it('should represent success and failure without throwing', () => {
    expect(successResult('audio')).toEqual({ok: true, value: 'audio'})
    expect(failureResult({code: 'failure'})).toEqual({error: {code: 'failure'}, ok: false})
  })
})
