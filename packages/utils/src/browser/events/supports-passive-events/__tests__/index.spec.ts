/**
 * @vitest-environment jsdom
 */
import {supportsPassiveEvents} from '../'
import {describe, expect, it} from 'vitest'

describe('supportsPassiveEvents', () => {
  it('should return true if browser supports passive', () => {
    expect(supportsPassiveEvents()).toBe(true)
  })
})
