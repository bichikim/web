/** @vitest-environment jsdom */

import {render, screen} from '@solidjs/testing-library'
import type {JSX} from 'solid-js'
import {expect, it, vi} from 'vitest'

import AppInTossTermsPage from '../app-in-toss/terms'
import AppsInTossTermsPage from '../apps-in-toss/terms'
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

it('should render the App in Toss terms at the singular route', () => {
  render(() => <AppInTossTermsPage />)

  expect(screen.getByRole('heading', {name: 'Pomofi 서비스 이용약관'})).toBeTruthy()
})

it('should redirect the plural App in Toss terms route to the singular route', () => {
  render(() => <AppsInTossTermsPage />)

  expect(screen.getByTestId('destination').textContent).toBe('/app-in-toss/terms')
})
