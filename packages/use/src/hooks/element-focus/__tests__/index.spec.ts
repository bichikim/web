/**
 * @jest-environment jsdom
 */
import {useElementFocus} from '../'

describe('elementFocus', () => {
  it('should return element focus state ref (init focus false)', () => {
    const element = document.createElement('input')
    expect(useElementFocus(element).value).toBe(false)
  })
  it('should return element focus state ref (init focus true)', () => {
    const element = document.createElement('input')
    globalThis.document.body.append(element)
    element.focus()
    expect(useElementFocus(element).value).toBe(true)
  })

  it('should return element focus updated state ref', () => {
    const element = document.createElement('input')
    globalThis.document.body.append(element)
    expect(useElementFocus(element).value).toBe(false)
    element.focus()
    expect(useElementFocus(element).value).toBe(true)
    element.blur()
    expect(useElementFocus(element).value).toBe(false)
  })
})
