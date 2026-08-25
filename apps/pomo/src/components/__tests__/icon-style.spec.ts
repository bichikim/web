import {describe, expect, it} from 'vitest'

import {getPomoIconClass} from '../icon-style'

describe('getPomoIconClass', () => {
  it('should preserve the regular icon outside scribble style', () => {
    expect(getPomoIconClass('i-tabler-player-play', 'original')).toBe('i-tabler-player-play')
  })

  it('should replace supported controls in scribble style', () => {
    expect(getPomoIconClass('i-tabler-album', 'scribble')).toBe('i-pomo-scribble:album')
    expect(getPomoIconClass('i-tabler-player-play', 'scribble')).toBe('i-pomo-scribble:play')
    expect(getPomoIconClass('i-tabler-volume-off', 'scribble')).toBe('i-pomo-scribble:volume-off')
  })

  it('should replace scene and settings controls in scribble style', () => {
    expect(getPomoIconClass('i-tabler-sun', 'scribble')).toBe('i-pomo-scribble:sun')
    expect(getPomoIconClass('i-tabler-book-2', 'scribble')).toBe('i-pomo-scribble:book')
    expect(getPomoIconClass('i-tabler-user-scan', 'scribble')).toBe('i-pomo-scribble:user-scan')
    expect(getPomoIconClass('i-tabler-settings', 'scribble')).toBe('i-pomo-scribble:settings')
  })

  it('should preserve an unsupported icon in scribble style', () => {
    expect(getPomoIconClass('i-tabler-help', 'scribble')).toBe('i-tabler-help')
  })
})
