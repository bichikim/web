/**
 * @jest-environment jsdom
 */
import {useBlur} from '../'
import {getDocument, getHtmlElement} from '@winter-love/utils'
import {mountComposition} from '@winter-love/vue-test'

jest.mock('@winter-love/utils', () => {
  return {
    ...jest.requireActual('@winter-love/utils'),
    getDocument: jest.fn(),
    getHtmlElement: jest.fn(),
  }
})

const mockGetDocument: jest.Mock = getDocument as any
const mockGetHtmlElement: jest.Mock = getHtmlElement as any

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
    })()
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
