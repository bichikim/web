import {describe, expect, it, vi} from 'vitest'

describe.sequential('shared browser mocks', () => {
  it('should allow a test to restore local browser spies', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
    vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => undefined)
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined)
    vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined)

    vi.restoreAllMocks()
  })

  it('should reinstall shared browser mocks for the next test', () => {
    expect(() => document.createElement('audio').pause()).not.toThrow()
    expect(() => document.createElement('audio').load()).not.toThrow()
    expect(document.createElement('canvas').getContext('2d')).not.toBeNull()
    expect(() => window.scrollTo(0, 0)).not.toThrow()
  })
})
