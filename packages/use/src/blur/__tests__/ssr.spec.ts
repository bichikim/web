/**
 * @jest-environment node
 */

import {useBlur} from '../'
import {getDocument} from '@winter-love/utils'

describe('blur', () => {
  it('should blur', () => {
    const blur = useBlur()

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

    blur()
  })
})
