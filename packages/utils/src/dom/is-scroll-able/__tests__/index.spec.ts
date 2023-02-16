/**
 * @jest-environment jsdom
 */
import {isScrollAble} from '../'
import {getStyle} from '../../get-style'

jest.mock('../../get-style', () => ({
  getStyle: jest.fn(),
}))

const _getStyle = jest.mocked(getStyle)

describe('isScrollAble', () => {
  const setup = (style) => {
    _getStyle.mockReturnValueOnce(style)

    return {
      result: isScrollAble(document.createElement('div')),
    }
  }
  it('should return true with scroll', () => {
    const {result} = setup('auto')

    expect(result).toBe(true)
  })
  it('should return false with none scroll', () => {
    const {result} = setup('none')

    expect(result).toBe(false)
  })
})
