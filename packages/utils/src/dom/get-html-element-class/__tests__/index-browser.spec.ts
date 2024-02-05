import {describe, expect, it} from 'vitest'
import {getHtmlElementClass} from '../'

describe('getHtmlElement', () => {
  it('should return HTMLElement', () => {
    expect(getHtmlElementClass()).toBe(HTMLElement)
  })
})
