/** @vitest-environment jsdom */

import {cleanup, render, screen} from '@solidjs/testing-library'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import {
  type AppsInTossLocalePreparationResult,
  prepareAppsInTossLocale,
} from '../../../features/apps-in-toss-locale'
import {AppsInTossPrepare} from '../AppsInTossPrepare'

vi.mock('../../../features/apps-in-toss-locale/prepare-apps-in-toss-locale', () => ({
  prepareAppsInTossLocale: vi.fn(),
}))
vi.mock('../../apps-in-toss-loading-page/AppsInTossLoadingPage', () => ({
  AppsInTossLoadingPage: () => <p>loading page</p>,
}))

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  cleanup()
})

it('should render its children only after preparation succeeds', async () => {
  let resolvePreparation: ((result: AppsInTossLocalePreparationResult) => void) | undefined
  vi.mocked(prepareAppsInTossLocale).mockReturnValue(
    new Promise((resolve) => {
      resolvePreparation = resolve
    }),
  )
  const renderChild = vi.fn()
  const Child = () => {
    renderChild()
    return <p>prepared child</p>
  }

  render(() => (
    <AppsInTossPrepare>
      <Child />
    </AppsInTossPrepare>
  ))

  expect(screen.getByText('loading page')).toBeInTheDocument()
  expect(renderChild).not.toHaveBeenCalled()
  resolvePreparation?.({status: 'prepared'})
  await screen.findByText('prepared child')
  expect(renderChild).toHaveBeenCalledOnce()
})

it('should keep the loading page visible when preparation fails', async () => {
  vi.mocked(prepareAppsInTossLocale).mockResolvedValue({status: 'failed'})
  const renderChild = vi.fn()
  const Child = () => {
    renderChild()
    return <p>prepared child</p>
  }

  render(() => (
    <AppsInTossPrepare>
      <Child />
    </AppsInTossPrepare>
  ))

  expect(screen.getByText('loading page')).toBeInTheDocument()
  await Promise.resolve()
  expect(screen.getByText('loading page')).toBeInTheDocument()
  expect(screen.queryByText('prepared child')).not.toBeInTheDocument()
  expect(renderChild).not.toHaveBeenCalled()
})

it('should mark an unmounted preparation as inactive', async () => {
  let resolvePreparation: ((result: AppsInTossLocalePreparationResult) => void) | undefined
  let isActive: (() => boolean) | undefined
  vi.mocked(prepareAppsInTossLocale).mockImplementation((currentIsActive) => {
    isActive = currentIsActive
    return new Promise((resolve) => {
      resolvePreparation = resolve
    })
  })

  const result = render(() => (
    <AppsInTossPrepare>
      <p>prepared child</p>
    </AppsInTossPrepare>
  ))

  expect(isActive?.()).toBe(true)
  result.unmount()
  expect(isActive?.()).toBe(false)
  resolvePreparation?.({status: 'cancelled'})
  await Promise.resolve()
})
