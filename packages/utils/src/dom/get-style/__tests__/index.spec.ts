/**
 * @jest-environment jsdom
 */
import {getStyle} from '../'

describe('getStyle', () => {
  afterEach(() => {
    jest.spyOn(window, 'getComputedStyle').mockRestore()
  })
  const setup = () => {
    const getPropertyValue = jest.fn(() => 'mock')
    jest.spyOn(window, 'getComputedStyle').mockReturnValueOnce({
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
