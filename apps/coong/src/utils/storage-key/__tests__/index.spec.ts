import {describe, expect, it} from 'vitest'

import {getStorageKey} from '../index'

describe('getStorageKey', () => {
  it('should namespace a Coong storage key', () => {
    expect(getStorageKey('piano-scroll-left')).toBe('coong__piano-scroll-left')
  })
})
