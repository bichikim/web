/**
 * @jest-environment jsdom
 */
import {useBlur} from '../'
import {getDocument, getHtmlElementClass} from '@winter-love/utils'
import {mountComposition} from '@winter-love/vue-test'

jest.mock('@winter-love/utils')

const mockGetDocument = jest.mocked(getDocument)
const mockGetHtmlElement = jest.mocked(getHtmlElementClass)

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

    element.blur = jest.fn()

    fakeDocument.setActiveElement(element)

    setupState.blur()

    expect(element.blur).toBeCalledTimes(1)

    mockGetDocument.mockRestore()
    mockGetHtmlElement.mockRestore()
  })
})
