/** @vitest-environment jsdom */

import {render, screen} from '@solidjs/testing-library'
import type {JSX} from 'solid-js'
import {expect, it, vi} from 'vitest'

vi.mock('../../../features/sound-effects', () => ({
  SoundEffectsProvider: (props: {readonly children: JSX.Element}) => (
    <div aria-label="sound effects provider" role="group">
      {props.children}
    </div>
  ),
}))

import HomeLayout, {route} from '../(home-layout)'

it('should scope sound effects and playback metadata to the home route group', () => {
  render(() => <HomeLayout>home</HomeLayout>)

  expect(screen.getByRole('group', {name: 'sound effects provider'})).toContainElement(
    screen.getByText('home'),
  )
  expect(route.info?.focusRoomPlayback).toBe(true)
})
