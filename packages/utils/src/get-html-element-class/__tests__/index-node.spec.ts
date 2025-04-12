/**
 * @vitest-environment node
 */
import {getHtmlElementClass} from '../'
import {describe, expect, it} from 'vitest'

describe('getHtmlElement', () => {
  it('should get the HTMLElement', () => {
    expect(getHtmlElementClass()).toBeUndefined()
  })
})
