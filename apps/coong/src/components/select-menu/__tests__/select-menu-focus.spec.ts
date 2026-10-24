import {describe, expect, it} from 'vitest'
import {
  focusMenuItemByOffset,
  getEnabledMenuItemElements,
  isMenuNavigationKey,
} from '../select-menu-focus'

describe('select-menu-focus', () => {
  it('should return only enabled item elements', () => {
    const enabled = document.createElement('button')
    const disabled = document.createElement('button')

    const items = getEnabledMenuItemElements([
      {disabled: () => false, element: enabled},
      {disabled: () => true, element: disabled},
    ])

    expect(items).toEqual([enabled])
  })

  it('should wrap focus when moving past the last item', () => {
    const first = document.createElement('button')
    const second = document.createElement('button')

    const next = focusMenuItemByOffset([first, second], second, 1)

    expect(next).toBe(first)
  })

  it('should recognize menu navigation keys', () => {
    expect(isMenuNavigationKey('ArrowDown')).toBe(true)
    expect(isMenuNavigationKey('Enter')).toBe(false)
  })
})
