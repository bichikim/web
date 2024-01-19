/**
 * @vitest-environment node
 */
import {getHtmlElementClass} from '../'
import {describe, it, expect} from 'vitest'
describe('getHtmlElement', () => {
  it('should get the HTMLElement', () => {
    expect(getHtmlElementClass()).toBeUndefined()
  })
})
