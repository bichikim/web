import {describe, expect, it} from 'vitest'
import {CLASSES} from '../shared'

describe('CLASSES.mediaDock', () => {
  it('should keep the summary play button visible in a collapsed dialogue state', () => {
    expect(CLASSES.mediaDock).toContain(
      '[&[data-dialogue-active]:not([data-player-expanded])_.pomo-player-stage]:w-[var(--pomo-player-compact-width)]',
    )
    expect(CLASSES.mediaDock).toContain(
      '[&[data-dialogue-active]:not([data-player-expanded])_[data-player-summary]]:justify-center',
    )
    expect(CLASSES.mediaDock).not.toContain(
      '[&[data-dialogue-active]:not([data-player-expanded])_[data-player-play-summary-frame]]:hidden',
    )
  })
})
