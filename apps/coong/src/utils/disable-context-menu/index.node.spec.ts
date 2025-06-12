/**
 * @vitest-environment node
 */
import {describe, expect, it} from 'vitest'
import {createDisableContextMenu} from './index'

describe('createDisableContextMenu in node environment', () => {
  it('should not throw error when window is not available', () => {
    const disableContextMenu = createDisableContextMenu()

    expect(() => disableContextMenu(true)).not.toThrow()
    expect(() => disableContextMenu(false)).not.toThrow()
  })
})
