/** @vitest-environment jsdom */

import {render, screen} from '@solidjs/testing-library'
import {Suspense} from 'solid-js'
import {expect, it, vi} from 'vitest'

vi.mock('../../PStudio', () => ({PStudio: () => <p>studio loaded</p>}))

import {HomeStudio} from '../Studio'

it('should lazy-load the Pomo studio', async () => {
  render(() => (
    <Suspense fallback={<p>loading</p>}>
      <HomeStudio />
    </Suspense>
  ))

  expect(await screen.findByText('studio loaded')).toBeInTheDocument()
})
