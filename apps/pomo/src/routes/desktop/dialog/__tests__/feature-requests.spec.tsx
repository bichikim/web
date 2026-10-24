/** @vitest-environment jsdom */

import {render, screen} from '@solidjs/testing-library'
import {expect, it, vi} from 'vitest'

import DesktopFeatureRequestsDialogPage from '../feature-requests'

vi.mock('../../../../components/desktop-dialog/FeatureRequests', () => ({
  DesktopFeatureRequestsDialog: vi.fn(() => <div>desktop feature requests</div>),
}))

it('should render the desktop feature request dialog route', () => {
  render(() => <DesktopFeatureRequestsDialogPage />)

  expect(screen.getByText('desktop feature requests')).toBeInTheDocument()
})
