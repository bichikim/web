/** @vitest-environment jsdom */

import {render, screen} from '@solidjs/testing-library'
import {expect, it, vi} from 'vitest'

vi.mock('../../PLoadingStatus', () => ({
  PLoadingStatus: (props: {readonly message: string}) => <span>{props.message}</span>,
}))

import {PSceneFallback} from '../SceneFallback'

it('should announce that the scene is being prepared', () => {
  render(() => <PSceneFallback />)

  expect(screen.getByRole('status')).toHaveTextContent('장면 준비 중')
})
