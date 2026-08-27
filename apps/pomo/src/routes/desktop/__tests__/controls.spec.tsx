/** @vitest-environment jsdom */

import {render, screen} from '@solidjs/testing-library'
import {expect, it, vi} from 'vitest'

vi.mock('../../../components/PDesktopControls', () => ({
  PDesktopControls: () => <p>desktop controls page</p>,
}))

it('should render the desktop control surface route', async () => {
  const {default: DesktopControlsPage} = await import('../controls')
  render(() => <DesktopControlsPage />)

  expect(screen.getByText('desktop controls page')).toBeInTheDocument()
})
