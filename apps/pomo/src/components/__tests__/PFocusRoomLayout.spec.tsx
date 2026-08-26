/** @vitest-environment jsdom */

import {render, screen} from '@solidjs/testing-library'
import {createEffect, createSignal, type JSX} from 'solid-js'
import {expect, it, vi} from 'vitest'

const [pathname, setPathname] = createSignal('/outside')
const eventPlaybackStates: boolean[] = []

vi.mock('@solidjs/router', () => ({
  useLocation: () => ({
    get pathname() {
      return pathname()
    },
  }),
}))
vi.mock('../pomo-route', () => ({
  isPomoHomePath: (path: string) => path === '/',
  usesPomoLayout: (path: string) => path === '/' || path === '/studio',
}))
vi.mock('../PEventProvider', () => ({
  PEventProvider: (props: {
    readonly children: JSX.Element
    readonly isPlaybackEnabled: boolean
  }) => {
    createEffect(() => eventPlaybackStates.push(props.isPlaybackEnabled))
    return <div data-testid="event-provider">{props.children}</div>
  },
}))
vi.mock('../PFeedProvider', () => ({
  PFeedProvider: (props: {readonly children: JSX.Element}) => (
    <div data-testid="feed-provider">{props.children}</div>
  ),
}))

import {PFocusRoomLayout} from '../PFocusRoomLayout'

it('should bypass providers outside Pomo layout routes', () => {
  setPathname('/outside')
  render(() => <PFocusRoomLayout>content</PFocusRoomLayout>)

  expect(screen.getByText('content')).toBeInTheDocument()
  expect(screen.queryByTestId('event-provider')).not.toBeInTheDocument()
})

it('should retain providers and update playback state across Pomo routes', () => {
  eventPlaybackStates.length = 0
  setPathname('/')
  render(() => <PFocusRoomLayout>content</PFocusRoomLayout>)

  expect(screen.getByTestId('event-provider')).toContainElement(screen.getByTestId('feed-provider'))
  expect(eventPlaybackStates).toContain(true)

  setPathname('/studio')
  expect(screen.getByTestId('event-provider')).toBeInTheDocument()
  expect(eventPlaybackStates).toContain(false)
})
