/** @vitest-environment jsdom */

import {render, screen} from '@solidjs/testing-library'
import type {JSX} from 'solid-js'
import {expect, it, vi} from 'vitest'

import LegacyPrivacyPage from '../privacy'

vi.mock('@solidjs/router', () => ({
  Navigate: (props: {href: string}): JSX.Element => (
    <span data-testid="destination">{props.href}</span>
  ),
}))

it('should redirect the legacy privacy route to the web privacy route', () => {
  render(() => <LegacyPrivacyPage />)

  expect(screen.getByTestId('destination').textContent).toBe('/web/privacy')
})
