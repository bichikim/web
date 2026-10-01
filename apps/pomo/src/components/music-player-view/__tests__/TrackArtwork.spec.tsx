/** @vitest-environment jsdom */
import {cleanup, fireEvent, render} from '@solidjs/testing-library'
import {type ComponentProps, createSignal} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'
import {TrackArtwork} from '../TrackArtwork'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

it('should hide failed artwork and show the next track artwork', () => {
  const [track, setTrack] = createSignal<ComponentProps<typeof TrackArtwork>['currentTrack']>({
    artist: '가수',
    artworkUrl: '/cover.webp',
    durationSeconds: 10,
    id: 'one',
    source: '/one.mp3',
    title: '곡',
  })
  const view = render(() => <TrackArtwork currentTrack={track()} />)
  const image = view.container.querySelector('img')!
  expect(image).toHaveAttribute('src', '/cover.webp')
  expect(image).toBeVisible()
  fireEvent.error(image)
  expect(image).not.toBeVisible()
  setTrack({...track()!, artworkUrl: '/next.webp'})
  const nextImage = view.container.querySelector('img')!
  expect(nextImage).not.toBe(image)
  expect(nextImage).toBeVisible()
  expect(nextImage).toHaveAttribute('src', '/next.webp')
})

it('should omit artwork when the current track is cleared', () => {
  const [track, setTrack] = createSignal<ComponentProps<typeof TrackArtwork>['currentTrack']>({
    artist: '가수',
    artworkUrl: '/cover.webp',
    durationSeconds: 10,
    id: 'one',
    source: '/one.mp3',
    title: '곡',
  })
  const view = render(() => <TrackArtwork currentTrack={track()} />)
  expect(view.container.querySelector('img')).toBeInTheDocument()
  setTrack(undefined)
  expect(view.container.querySelector('img')).toBeNull()
})
