/**
 * @vitest-environment jsdom
 */
import nativeScrollIntoView from 'scroll-into-view-if-needed'
import smoothScrollIntoView from 'smooth-scroll-into-view-if-needed'
import {getDocument} from 'src/browser/dom/get-document'
import {beforeEach, describe, expect, it, vi} from 'vitest'
import {scrollIntoView, scrollIntoViewIfNeeded} from '../'

vi.mock('scroll-into-view-if-needed', () => ({default: vi.fn()}))
vi.mock('smooth-scroll-into-view-if-needed', () => ({default: vi.fn()}))
vi.mock('src/browser/dom/get-document')

describe('scrollIntoView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should use the native implementation when smooth scrolling is supported', () => {
    const target = document.createElement('div')

    vi.mocked(getDocument).mockReturnValue({
      documentElement: {style: {scrollBehavior: ''}},
    } as unknown as Document)

    scrollIntoView(target, {block: 'nearest'})

    expect(nativeScrollIntoView).toHaveBeenCalledWith(target, {block: 'nearest'})
    expect(smoothScrollIntoView).not.toHaveBeenCalled()
  })

  it('should select the fallback at call time when native support is unavailable', () => {
    const target = document.createElement('div')

    vi.mocked(getDocument).mockReturnValue({
      documentElement: {style: {}},
    } as unknown as Document)

    scrollIntoView(target)

    expect(smoothScrollIntoView).toHaveBeenCalledWith(target)
    expect(nativeScrollIntoView).not.toHaveBeenCalled()
  })

  it('should scroll only when the target is outside a scroll viewport', () => {
    const target = document.createElement('div')

    vi.mocked(getDocument).mockReturnValue({
      documentElement: {style: {scrollBehavior: ''}},
    } as unknown as Document)

    scrollIntoViewIfNeeded(target)

    expect(nativeScrollIntoView).toHaveBeenCalledWith(target, {
      block: 'nearest',
      inline: 'nearest',
      scrollMode: 'if-needed',
    })
  })

  it('should preserve caller options while enforcing conditional scrolling', () => {
    const target = document.createElement('div')

    vi.mocked(getDocument).mockReturnValue({
      documentElement: {style: {}},
    } as unknown as Document)

    scrollIntoViewIfNeeded(target, {behavior: 'smooth', block: 'center'})

    expect(smoothScrollIntoView).toHaveBeenCalledWith(target, {
      behavior: 'smooth',
      block: 'center',
      inline: 'nearest',
      scrollMode: 'if-needed',
    })
  })
})
