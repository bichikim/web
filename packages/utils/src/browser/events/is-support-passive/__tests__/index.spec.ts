/**
 * @jest-environment jsdom
 */
import {isSupportPassive} from '../'
import {describe, expect, it} from 'vitest'

describe('isSupportPassive', () => {
  it('should return true if browser supports passive', () => {
    expect(isSupportPassive()).toBe(true)
  })
})
