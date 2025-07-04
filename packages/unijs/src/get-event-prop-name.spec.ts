import {describe, expect, it} from 'vitest'
import {getEventPropName} from './get-event-prop-name'

describe('getEventPropName', () => {
  it('should return the event prop name', () => {
    expect(getEventPropName('onClick')).toBe('click')
  })

  it('should return the event prop name', () => {
    expect(getEventPropName('on:click')).toBe('click')
  })

  it('should return the event prop name', () => {
    expect(getEventPropName('onBlur')).toBe('blur')
  })

  it('should return the event prop name', () => {
    expect(getEventPropName('onFocus')).toBe('focus')
  })
})
