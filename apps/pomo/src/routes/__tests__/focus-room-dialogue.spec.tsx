/** @vitest-environment jsdom */

import {render, screen} from '@solidjs/testing-library'
import type {JSX} from 'solid-js'
import {expect, it, vi} from 'vitest'

import LegacyDialoguePage from '../focus-room-dialogue'

vi.mock('@solidjs/router', () => ({
  Navigate: (props: {href: string}): JSX.Element => (
    <span data-testid="destination">{props.href}</span>
  ),
  useLocation: () => ({search: '?dialogueId=saved-dialogue'}),
}))

it('should preserve the dialogue id while redirecting the legacy editor route', () => {
  render(() => <LegacyDialoguePage />)

  expect(screen.getByTestId('destination').textContent).toBe('/dialogue?dialogueId=saved-dialogue')
})
