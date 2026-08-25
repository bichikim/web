/** @vitest-environment jsdom */

import {render, screen} from '@solidjs/testing-library'
import {expect, it, vi} from 'vitest'

vi.mock('../[...404]', () => ({default: () => <p>not found</p>}))

import {createLocalizedRoute} from '../create-localized-route'

const LocalizedPage = createLocalizedRoute(() => <p>localized page</p>)

it.each(['ko', 'en'] as const)('should render the page for the %s locale', (locale) => {
  render(() => <LocalizedPage params={{locale}} />)

  expect(screen.getByText('localized page')).toBeInTheDocument()
})

it.each([undefined, 'invalid'] as const)(
  'should render not found for the unsupported %s locale',
  (locale) => {
    render(() => <LocalizedPage params={{locale}} />)

    expect(screen.getByText('not found')).toBeInTheDocument()
  },
)
