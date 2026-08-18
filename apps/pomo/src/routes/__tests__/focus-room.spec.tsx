/** @vitest-environment jsdom */

import {render, screen} from '@solidjs/testing-library'
import type {JSX} from 'solid-js'
import {expect, it, vi} from 'vitest'

import LegacyPomoPage from '../focus-room'

vi.mock('@solidjs/router', () => ({
  Navigate: (props: {href: string}): JSX.Element => (
    <span data-testid="destination">{props.href}</span>
  ),
}))

it('should redirect the legacy focus room route to Pomo', () => {
  render(() => <LegacyPomoPage />)

  expect(screen.getByTestId('destination').textContent).toBe('/')
})
