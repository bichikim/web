/** @vitest-environment jsdom */

import {render, screen} from '@solidjs/testing-library'
import {createEffect, createSignal, type JSX} from 'solid-js'
import {expect, it, vi} from 'vitest'

const [playbackEnabled, setPlaybackEnabled] = createSignal(false)
const [pathname, setPathname] = createSignal('/settings')
const eventPlaybackStates: boolean[] = []
const componentMocks = vi.hoisted(() => ({eventProvider: vi.fn()}))

vi.mock('@solidjs/router', () => ({
  useCurrentMatches: () => () => [
    {route: {info: playbackEnabled() ? {focusRoomPlayback: true} : {}}},
  ],
  useLocation: () => ({
    get pathname() {
      return pathname()
    },
  }),
}))
vi.mock('../../components/p-event-provider/PEventProvider', () => ({
  PEventProvider: componentMocks.eventProvider,
}))
vi.mock('../../components/p-feed-provider/PFeedProvider', () => ({
  PFeedProvider: (props: {readonly children: JSX.Element}) => (
    <div aria-label="feed provider" role="group">
      {props.children}
    </div>
  ),
}))

import MainLayout from '../(main-layout)'

it('should retain shared providers and enable focus-room playback for normalized root paths', () => {
  componentMocks.eventProvider.mockImplementation(
    (props: {
      readonly children: JSX.Element
      readonly isDelayedEndEventEnabled: boolean
      readonly isPlaybackEnabled: boolean
    }) => {
      createEffect(() => eventPlaybackStates.push(props.isPlaybackEnabled))
      return (
        <div aria-label="event provider" role="group">
          {props.children}
        </div>
      )
    },
  )
  componentMocks.eventProvider.mockClear()
  eventPlaybackStates.length = 0
  setPlaybackEnabled(true)

  render(() => <MainLayout>page</MainLayout>)

  expect(screen.getByRole('group', {name: 'event provider'})).toContainElement(
    screen.getByRole('group', {name: 'feed provider'}),
  )
  expect(eventPlaybackStates).toEqual([true])
  expect(componentMocks.eventProvider.mock.lastCall?.[0].isDelayedEndEventEnabled).toBe(true)

  setPlaybackEnabled(false)

  expect(componentMocks.eventProvider).toHaveBeenCalledOnce()
  expect(eventPlaybackStates).toEqual([true, false])
  expect(screen.getByText('page')).toBeInTheDocument()

  setPathname('///')

  expect(eventPlaybackStates).toEqual([true, false, true])

  setPathname('/settings')

  expect(eventPlaybackStates).toEqual([true, false, true, false])
})
