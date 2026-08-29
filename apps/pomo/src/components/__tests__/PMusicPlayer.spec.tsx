/** @vitest-environment jsdom */

import {render} from '@solidjs/testing-library'
import {expect, it, vi} from 'vitest'

import {PMusicPlayer} from '../PMusicPlayer'
import {PMusicPlayerPanel} from '../music-player/Panel'

vi.mock('../music-player/Panel', () => ({PMusicPlayerPanel: vi.fn()}))

it('should forward player state and events', () => {
  const onExpandedChange = vi.fn()
  const onPlayingChange = vi.fn()
  const onTrackChange = vi.fn()
  vi.mocked(PMusicPlayerPanel).mockImplementation((props) => {
    props.onExpandedChange?.(true)
    props.onPlayingChange?.(true)
    props.onTrackChange?.(null)
    return null
  })

  render(() => (
    <PMusicPlayer
      expanded
      isDialogueActive
      onExpandedChange={onExpandedChange}
      onPlayingChange={onPlayingChange}
      onTrackChange={onTrackChange}
      sceneStyle="original"
    />
  ))

  expect(PMusicPlayerPanel).toHaveBeenCalledWith(
    expect.objectContaining({expanded: true, isDialogueActive: true, sceneStyle: 'original'}),
  )
  expect(onExpandedChange).toHaveBeenCalledWith(true)
  expect(onPlayingChange).toHaveBeenCalledWith(true)
  expect(onTrackChange).toHaveBeenCalledWith(null)
})

it('should allow omitted event callbacks', () => {
  vi.mocked(PMusicPlayerPanel).mockImplementation((props) => {
    props.onExpandedChange?.(false)
    props.onPlayingChange?.(false)
    props.onTrackChange?.(null)
    return null
  })

  expect(() => render(() => <PMusicPlayer />)).not.toThrow()
})
