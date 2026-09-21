/** @vitest-environment jsdom */

import {render, screen} from '@solidjs/testing-library'
import {createEffect, createSignal, type JSX} from 'solid-js'
import {expect, it, vi} from 'vitest'

const [pathname, setPathname] = createSignal('/outside')
const eventPlaybackStates: boolean[] = []
const delayedEndEventStates: boolean[] = []

vi.mock('@solidjs/router', () => ({
  useLocation: () => ({
    get pathname() {
      return pathname()
    },
  }),
}))
vi.mock('../../pomo-route', () => ({
  isPomoHomePath: (path: string) => path === '/',
  usesPomoLayout: (path: string) =>
    path === '/' || path === '/studio' || path === '/desktop/dialog/settings',
}))
vi.mock('../../p-event-provider/PEventProvider', () => ({
  PEventProvider: (props: {
    readonly children: JSX.Element
    readonly isDelayedEndEventEnabled: boolean
    readonly isPlaybackEnabled: boolean
  }) => {
    createEffect(() => eventPlaybackStates.push(props.isPlaybackEnabled))
    createEffect(() => delayedEndEventStates.push(props.isDelayedEndEventEnabled))
    return <div data-testid="event-provider">{props.children}</div>
  },
}))
vi.mock('../../p-feed-provider/PFeedProvider', () => ({
  PFeedProvider: (props: {readonly children: JSX.Element}) => (
    <div data-testid="feed-provider">{props.children}</div>
  ),
}))
vi.mock('../../../features/sound-effects', () => ({
  SoundEffectsProvider: (props: {readonly children: JSX.Element}) => (
    <div data-testid="sound-effects-provider">{props.children}</div>
  ),
}))

import {PFocusRoomLayout} from '../PFocusRoomLayout'

it('should bypass providers outside Pomo layout routes', () => {
  setPathname('/outside')
  render(() => <PFocusRoomLayout>content</PFocusRoomLayout>)

  expect(screen.getByText('content')).toBeInTheDocument()
  expect(screen.queryByTestId('event-provider')).not.toBeInTheDocument()
})

it('should retain layout providers and update playback state across Pomo routes', () => {
  eventPlaybackStates.length = 0
  delayedEndEventStates.length = 0
  setPathname('/')
  render(() => <PFocusRoomLayout>content</PFocusRoomLayout>)

  expect(screen.getByTestId('event-provider')).toContainElement(screen.getByTestId('feed-provider'))
  expect(eventPlaybackStates).toContain(true)
  expect(delayedEndEventStates).toContain(true)

  setPathname('/desktop/dialog/settings')
  expect(screen.getByTestId('event-provider')).toBeInTheDocument()
  expect(eventPlaybackStates).toContain(false)
  expect(delayedEndEventStates).toContain(true)
})

it('should mount sound effects only on the Pomo home route', () => {
  setPathname('/')
  render(() => <PFocusRoomLayout>content</PFocusRoomLayout>)

  expect(screen.getByTestId('sound-effects-provider')).toContainElement(screen.getByText('content'))

  setPathname('/studio')

  expect(screen.queryByTestId('sound-effects-provider')).not.toBeInTheDocument()
})
