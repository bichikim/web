/** @vitest-environment jsdom */

import {render, screen} from '@solidjs/testing-library'
import {expect, it, vi} from 'vitest'

const termsMocks = vi.hoisted(() => ({PServiceTerms: vi.fn()}))

vi.mock('src/features/service-terms', () => termsMocks)

import WebTermsPage from '../terms'

it('should render the service terms for the web platform', () => {
  termsMocks.PServiceTerms.mockReturnValue(<div>Web service terms</div>)

  render(() => <WebTermsPage />)

  expect(screen.getByText('Web service terms')).toBeInTheDocument()
  expect(termsMocks.PServiceTerms).toHaveBeenCalledWith({platform: 'web'})
})
