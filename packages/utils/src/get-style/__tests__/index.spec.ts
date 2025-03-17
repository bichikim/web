/**
 * @vitest-environment jsdom
 */
import {afterEach, describe, expect, it, vi} from 'vitest'
import {getStyle} from '../'

describe('getStyle', () => {
  afterEach(() => {
    vi.spyOn(window, 'getComputedStyle').mockRestore()
  })

  const setup = () => {
    const getPropertyValue = vi.fn(() => 'mock')

    vi.spyOn(window, 'getComputedStyle').mockReturnValueOnce({
      getPropertyValue,
    } as any)
    const element = document.createElement('div')

    return {
      element,
      getPropertyValue,
      result: getStyle(element, 'marginRight'),
    }
  }

  it('should ', () => {
    const {result, element, getPropertyValue} = setup()

    expect(getComputedStyle).toHaveBeenCalledWith(element)
    expect(getPropertyValue).toHaveBeenCalledWith('margin-right')
    expect(result).toBe('mock')
  })
})
