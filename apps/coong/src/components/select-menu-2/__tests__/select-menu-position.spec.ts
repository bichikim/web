import {describe, expect, it, vi} from 'vitest'
import {computeSelectMenuPosition} from '../select-menu-position'

describe('computeSelectMenuPosition', () => {
  it('should anchor the menu below the trigger with right edges aligned', () => {
    const panel = document.createElement('div')

    vi.spyOn(panel, 'getBoundingClientRect').mockReturnValue({
      bottom: 0,
      height: 0,
      left: 0,
      right: 224,
      toJSON: () => ({}),
      top: 0,
      width: 224,
      x: 0,
      y: 0,
    })

    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 1280,
    })

    const position = computeSelectMenuPosition({
      anchorBounds: {
        height: 32,
        width: 224,
        x: 100,
        y: 8,
      },
      panelElement: panel,
    })

    expect(position).toEqual({left: 100, top: 48})
  })
})
