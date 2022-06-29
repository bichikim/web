/**
 * @jest-environment node
 */

import {isListenable} from '../'

describe('isListenable in SSR', () => {
  it('should return false', () => {
    const result = isListenable()
    expect(result).toBeFalsy()
  })
})
