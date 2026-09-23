/** @vitest-environment jsdom */

import {cleanup, render, screen, within} from '@solidjs/testing-library'
import {afterEach, describe, expect, it, vi} from 'vitest'
import * as m from '@paraglide/message'

import {PTrackList} from '../PTrackList'

const TRACK = {
  artist: 'Artist',
  durationSeconds: 1,
  id: 'one',
  source: '/one.mp3',
  title: 'One',
} as const

describe('PTrackList', () => {
  afterEach(cleanup)

  it('should show a preparation row while the playlist is loading', () => {
    render(() => (
      <PTrackList currentIndex={0} isPlaylistLoading={true} onTrackSelect={vi.fn()} tracks={[]} />
    ))

    const status = screen.getByRole('status')

    expect(status).toHaveTextContent(m.player_fallback_title())
    expect(status.querySelector('span[aria-hidden="true"]')).toBeTruthy()
    expect(screen.queryAllByRole('button')).toHaveLength(0)
  })

  it('should hide the preparation row after loading settles', () => {
    render(() => (
      <PTrackList
        currentIndex={0}
        isPlaylistLoading={false}
        onTrackSelect={vi.fn()}
        tracks={[TRACK]}
      />
    ))

    expect(screen.queryByRole('status')).toBeNull()
    expect(screen.getByRole('button', {name: 'One · Artist'})).toBeInTheDocument()
  })

  it('should keep the preparation status outside the track list', () => {
    render(() => (
      <PTrackList
        currentIndex={0}
        isPlaylistLoading={true}
        onTrackSelect={vi.fn()}
        tracks={[TRACK]}
      />
    ))

    const list = screen.getByRole('list')
    const status = screen.getByRole('status')

    expect(list).toHaveAttribute('aria-busy', 'true')
    expect(within(list).getAllByRole('listitem')).toHaveLength(1)
    expect(list.contains(status)).toBe(false)
  })
})
