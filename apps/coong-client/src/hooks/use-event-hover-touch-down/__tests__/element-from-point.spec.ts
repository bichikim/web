/**
 * @vitest-environment jsdom
 */

import {elementFromPoint} from '../element-from-point'
import {describe, expect, it, vi} from 'vitest'
import {getDocument} from '@winter-love/utils'

vi.mock('@winter-love/utils')
describe('elementFromPoint', () => {
  it('should return element point', () => {
    const element = document.createElement('div')
    const fakeElementFromPoint = vi.fn(() => element)
    const point = {x: 0, y: 1}
    const fakeDocument: any = {
      elementFromPoint: fakeElementFromPoint,
    }
    vi.mocked(getDocument).mockReturnValue(fakeDocument)

    expect(elementFromPoint(point.x, point.y)).toBe(element)
    expect(fakeElementFromPoint).toHaveBeenCalledWith(point.x, point.y)
  })
})
