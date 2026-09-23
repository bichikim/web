/** @vitest-environment jsdom */

import {render, screen} from '@solidjs/testing-library'
import {expect, it, vi} from 'vitest'

vi.mock('../../p-loading-status/PLoadingStatus', () => ({
  PLoadingStatus: (props: {readonly message: string}) => <span>{props.message}</span>,
}))

import {PSceneFallback} from '../SceneFallback'

it('should announce that the scene is being prepared', () => {
  render(() => <PSceneFallback />)

  const status = screen.getByRole('status')

  expect(status).toHaveClass('pointer-events-none', 'absolute', 'inset-0')
  expect(status).toHaveTextContent('장면 준비 중')
  expect(status.firstElementChild).toHaveClass('border', 'border-border', 'rounded-control')
})
