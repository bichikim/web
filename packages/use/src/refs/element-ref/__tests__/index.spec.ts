/**
 * @jest-environment jsdom
 */
import {resolveElement} from 'src/utils'
import {elementRef} from '../'

jest.mock('src/utils')

const _resolveElementRef = jest.mocked(resolveElement)

describe('elementRef', () => {
  it('should resolve element', () => {
    const element = document.createElement('div')
    _resolveElementRef.mockReturnValueOnce(element)
    const result = elementRef()

    expect(result.value).toBe(element)
  })
})
