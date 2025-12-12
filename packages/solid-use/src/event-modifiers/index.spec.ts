/**
 * @vitest-environment jsdom
 */
import {stopPropagation} from './'
import {describe, expect, it, vi} from 'vitest'

describe('stopPropagation', () => {
  it('should stop event propagation', () => {
    const event = new Event('click')

    vi.spyOn(event, 'stopPropagation')
    const callback = vi.fn()
    const handler = stopPropagation(callback)

    handler(event)
    expect(event.stopPropagation).toHaveBeenCalled()
    expect(callback).toHaveBeenCalledWith(event)
  })

  it('should work without callback', () => {
    const event = new Event('click')

    vi.spyOn(event, 'stopPropagation')
    const handler = stopPropagation()

    handler(event)
    expect(event.stopPropagation).toHaveBeenCalled()
  })
})
