/**
 * @vitest-environment jsdom
 */
import {onEvent} from '../'
import {describe, expect, it, vi} from 'vitest'

describe('onEvent', () => {
  it.each([
    //
    {target: window},
    {target: window},
    {target: document.createElement('div')},
  ])('should emit events', ({target}) => {
    const callback = vi.fn()
    const type = 'click'
    // won't mock watch
    // won't mock addEventListener and removeEventListener
  })
})
