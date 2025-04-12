/**
 * @vitest-environment jsdom
 */
import {describe, expect, it, vi} from 'vitest'
import {isScrollAble} from '../'
import {getStyle} from '../../get-style'

vi.mock('../../get-style', () => ({
  getStyle: vi.fn(),
}))

const _getStyle = vi.mocked(getStyle)

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
