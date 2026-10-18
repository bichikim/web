import {expect, it, vi} from 'vitest'
import {isDesktopMode} from '../is-desktop-mode'

it.each(['normal', 'widget', 'desktop', 'interactiveDesktop'])(
  'should accept the supported mode %s',
  (mode) => {
    expect(isDesktopMode(mode)).toBe(true)
  },
)

it.each(['', 'floating', 'Normal', ' desktop', 'widget ', null, undefined, false, 0])(
  'should reject the unsupported value %s',
  (value) => {
    expect(isDesktopMode(value)).toBe(false)
  },
)

it('should reject objects without coercing or reading their properties', () => {
  const get = vi.fn(() => {
    throw new Error('properties must not be read')
  })

  expect(isDesktopMode(new Proxy({}, {get}))).toBe(false)
  expect(get).not.toHaveBeenCalled()
})
