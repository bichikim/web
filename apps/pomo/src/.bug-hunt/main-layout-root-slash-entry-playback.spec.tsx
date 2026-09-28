/** @vitest-environment jsdom */

import {render} from '@solidjs/testing-library'
import {createEffect, type JSX} from 'solid-js'
import {expect, it, vi} from 'vitest'

import {normalizePathname} from '../components/pomo-route'

const eventPlaybackStates: boolean[] = []
const componentMocks = vi.hoisted(() => ({eventProvider: vi.fn()}))

vi.mock('@solidjs/router', () => ({
  useCurrentMatches: () => () => [{route: {info: {}}}],
  useLocation: () => ({pathname: '///', search: '', hash: '', query: {}, state: null, key: ''}),
}))
vi.mock('../components/p-event-provider/PEventProvider', () => ({
  PEventProvider: componentMocks.eventProvider,
}))
vi.mock('../components/p-feed-provider/PFeedProvider', () => ({
  PFeedProvider: (props: {readonly children: JSX.Element}) => <>{props.children}</>,
}))

import MainLayout from '../routes/(main-layout)'

it('should enable entry playback for slash-normalized root URLs without home route metadata', () => {
  componentMocks.eventProvider.mockImplementation(
    (props: {readonly isPlaybackEnabled: boolean}) => {
      createEffect(() => eventPlaybackStates.push(props.isPlaybackEnabled))
      return null
    },
  )
  componentMocks.eventProvider.mockClear()
  eventPlaybackStates.length = 0

  expect(normalizePathname('///')).toBe('/')

  render(() => <MainLayout>page</MainLayout>)

  expect(eventPlaybackStates.at(-1)).toBe(true)
})
