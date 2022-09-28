/**
 * @jest-environment jsdom
 */
import {getNativeElement} from '../'

describe('getElement', () => {
  it('should return element', () => {
    expect(getNativeElement(document.body)).toBe(document.body)
    expect(getNativeElement('body')).toBe(document.body)
  })
})
