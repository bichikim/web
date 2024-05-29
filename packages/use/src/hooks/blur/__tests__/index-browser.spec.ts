/**
 * @jest-environment jsdom
 */
import {useBlur} from '../'
import {getDocument, getHtmlElementClass} from '@winter-love/utils'
import {mountComposition} from '@winter-love/test-utils'
import {describe, it, expect, vi} from 'vitest'
vi.mock('@winter-love/utils')

const mockGetDocument = vi.mocked(getDocument)
const mockGetHtmlElement = vi.mocked(getHtmlElementClass)

describe('blur', () => {
  it('should blur', () => {
    const fakeDocument = (() => {
      let _activeElement
      return {
        get activeElement() {
          return _activeElement
        },
        setActiveElement(element) {
          _activeElement = element
        },
      }
    })() as any
    mockGetDocument.mockImplementation(() => fakeDocument)
    mockGetHtmlElement.mockImplementation(() => HTMLElement)

    const {setupState} = mountComposition(() => {
      const blur = useBlur()
      return {
        blur,
      }
    })

    const element = document.createElement('div')

    element.blur = vi.fn()

    fakeDocument.setActiveElement(element)

    setupState.blur()

    expect(element.blur).toBeCalledTimes(1)

    mockGetDocument.mockRestore()
    mockGetHtmlElement.mockRestore()
  })
})
