/** @vitest-environment jsdom */

import {render, screen} from '@solidjs/testing-library'
import type {JSX} from 'solid-js'
import {expect, it, vi} from 'vitest'

import LegacyTermsPage from '../terms'

vi.mock('@solidjs/router', () => ({
  Navigate: (props: {href: string}): JSX.Element => (
    <span data-testid="destination">{props.href}</span>
  ),
}))

it('should redirect the legacy terms route to the web terms route', () => {
  render(() => <LegacyTermsPage />)

  expect(screen.getByTestId('destination').textContent).toBe('/web/terms')
})
