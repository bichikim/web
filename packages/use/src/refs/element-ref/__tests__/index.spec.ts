/**
 * @vitest-environment jsdom
 */
import {resolveElement} from 'src/utils'
import {elementRef} from '../'
import {describe, expect, it, vi} from 'vitest'

vi.mock('src/utils')

const _resolveElementRef = vi.mocked(resolveElement)

describe('elementRef', () => {
  it('should resolve element', () => {
    const element = document.createElement('div')
    _resolveElementRef.mockReturnValueOnce(element)
    const result = elementRef()

    expect(result.value).toBe(element)
  })
})
