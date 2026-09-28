/** @vitest-environment jsdom */

import {cleanup, render, screen, waitFor} from '@solidjs/testing-library'
import {afterEach, expect, it, vi} from 'vitest'

import {prepareAppsInTossLocale} from '../features/apps-in-toss-locale/prepare-apps-in-toss-locale'
import {AppsInTossPrepare} from '../components/apps-in-toss-prepare/AppsInTossPrepare'

vi.mock('../features/apps-in-toss-locale/prepare-apps-in-toss-locale', () => ({
  prepareAppsInTossLocale: vi.fn(),
}))
vi.mock('../components/apps-in-toss-loading-page/AppsInTossLoadingPage', () => ({
  AppsInTossLoadingPage: () => <p>loading page</p>,
}))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

it('should keep the loading screen when Apps in Toss locale preparation fails', async () => {
  vi.mocked(prepareAppsInTossLocale).mockResolvedValue(undefined)

  render(() => (
    <AppsInTossPrepare>
      <p>prepared child</p>
    </AppsInTossPrepare>
  ))

  await waitFor(() => expect(prepareAppsInTossLocale).toHaveBeenCalledOnce())

  expect(screen.getByText('loading page')).toBeInTheDocument()
  expect(screen.queryByText('prepared child')).not.toBeInTheDocument()
})
