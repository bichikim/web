/** @vitest-environment jsdom */

import {render, screen} from '@solidjs/testing-library'
import {expect, it, vi} from 'vitest'

const policyMocks = vi.hoisted(() => ({PPrivacyPolicy: vi.fn()}))

vi.mock('src/components/PPrivacyPolicy', () => policyMocks)

import WebPrivacyPage from '../privacy'

it('should render the privacy policy for the web platform', () => {
  policyMocks.PPrivacyPolicy.mockReturnValue(<div>Web privacy policy</div>)

  render(() => <WebPrivacyPage />)

  expect(screen.getByText('Web privacy policy')).toBeInTheDocument()
  expect(policyMocks.PPrivacyPolicy).toHaveBeenCalledWith({platform: 'web'})
})
