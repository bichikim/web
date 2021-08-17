/**
 * @jest-environment node
 */

import {useBlur} from '../'

describe('blur', () => {
  it('should blur', () => {
    const blur = useBlur()

    blur()
  })
})
