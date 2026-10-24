/** @vitest-environment jsdom */
import {render, screen} from '@solidjs/testing-library'
import {expect, it, vi} from 'vitest'
import {createBackground} from 'src/features/background/__tests__/fixtures/controller'
import {Player} from '../Player'
vi.mock('../Canvas', () => ({Canvas: () => <div>album canvas loaded</div>}))
it('should load the client canvas when mounted', async () => {
  render(() => <Player background={createBackground()} />)
  expect(await screen.findByText('album canvas loaded')).toBeInTheDocument()
})
