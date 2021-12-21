/**
 * @jest-environment jsdom
 */

import {useBlur} from '../'
import {getDocument, getHTMLElement} from '@winter-love/utils'
import {mountUse} from '@winter-love/test-use'

jest.mock('@winter-love/utils', () => {
  return {
    ...jest.requireActual('@winter-love/utils'),
    getDocument: jest.fn(),
    getHTMLElement: jest.fn(),
  }
})

const mockGetDocument: jest.Mock = getDocument as any
const mockGetHTMLElement: jest.Mock = getHTMLElement as any

describe('blur', () => {
  it('should blur', () => {

    const _document = (() => {
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
    mockGetDocument.mockImplementation(() => _document)
    mockGetHTMLElement.mockImplementation(() => HTMLElement)

    const {result} = mountUse(() => {
      const blur = useBlur()
      return {
        blur,
      }
    })

    const element = document.createElement('div')

    element.blur = jest.fn()

    _document.setActiveElement(element)

    result.blur()

    expect(element.blur).toBeCalledTimes(1)

    mockGetDocument.mockRestore()
    mockGetHTMLElement.mockRestore()
  })
})
