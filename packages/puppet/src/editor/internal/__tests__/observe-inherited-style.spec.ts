/** @vitest-environment jsdom */
import {expect, test, vi} from 'vitest'
import {observeInheritedStyle} from '../observe-inherited-style'

test('should observe ancestor theme changes across shadow boundaries and stop on disposal', async () => {
  const host = document.createElement('div')
  const sibling = document.createElement('div')
  document.body.append(host, sibling)
  const canvas = document.createElement('canvas')
  host.attachShadow({mode: 'open'}).append(canvas)
  const changed = vi.fn()
  // jsdom does not resolve inherited custom properties across shadow roots.
  const computed = vi.spyOn(globalThis, 'getComputedStyle').mockImplementation(() => host.style)
  const stop = observeInheritedStyle({
    element: canvas,
    onChange: changed,
    properties: ['--puppet-color-control'],
  })
  try {
    host.style.setProperty('--puppet-color-control', '#f080c0')
    await Promise.resolve()
    expect(changed).toHaveBeenCalledTimes(1)
    host.className = 'alternate-theme'
    await Promise.resolve()
    expect(changed).toHaveBeenCalledTimes(1)
    host.style.setProperty('--camera-x', '20px')
    await Promise.resolve()
    expect(changed).toHaveBeenCalledTimes(1)
    host.style.setProperty('--puppet-color-control', '#b0e080')
    await Promise.resolve()
    expect(changed).toHaveBeenCalledTimes(2)
    sibling.className = 'unrelated'
    await Promise.resolve()
    expect(changed).toHaveBeenCalledTimes(2)
    stop()
    host.style.setProperty('--puppet-color-control', '#e080b0')
    await Promise.resolve()
    expect(changed).toHaveBeenCalledTimes(2)
  } finally {
    stop()
    computed.mockRestore()
    host.remove()
    sibling.remove()
  }
})
