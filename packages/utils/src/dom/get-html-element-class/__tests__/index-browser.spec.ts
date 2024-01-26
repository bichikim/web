import {describe, it, expect} from 'vitest'
import {getHtmlElementClass} from '../'

describe('getHtmlElement', () => {
  it('should return HTMLElement', () => {
    expect(getHtmlElementClass()).toBe(HTMLElement)
  })
})
