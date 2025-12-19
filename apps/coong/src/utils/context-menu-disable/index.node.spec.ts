/**
 * @vitest-environment node
 */
import {describe, expect, it} from 'vitest'
import {createContextMenuDisable} from './index'

describe('createContextMenuDisable in node environment', () => {
  it('should not throw error when window is not available', () => {
    const disableContextMenu = createContextMenuDisable()

    expect(() => disableContextMenu(true)).not.toThrow()
    expect(() => disableContextMenu(false)).not.toThrow()
  })
})
