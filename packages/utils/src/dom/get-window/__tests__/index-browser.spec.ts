import {describe, it, expect} from 'vitest'
import {getWindow} from '../'

describe('getWindow', () => {
  it('should return the window', () => {
    expect(getWindow()).toBe(window)
  })
})
