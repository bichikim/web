/** @vitest-environment jsdom */

import {render, screen} from '@solidjs/testing-library'
import type {JSX} from 'solid-js'
import {expect, it, vi} from 'vitest'

import AppInTossPrivacyPage from '../app-in-toss/privacy'
import AppsInTossPrivacyPage from '../apps-in-toss/privacy'
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

it('should render the App in Toss privacy policy at the singular route', () => {
  render(() => <AppInTossPrivacyPage />)

  expect(screen.getByRole('heading', {name: 'Pomofi 개인정보처리방침'})).toBeTruthy()
})

it('should redirect the plural App in Toss privacy route to the singular route', () => {
  render(() => <AppsInTossPrivacyPage />)

  expect(screen.getByTestId('destination').textContent).toBe('/app-in-toss/privacy')
})
