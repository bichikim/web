/** @vitest-environment jsdom */

import {cleanup, render, screen} from '@solidjs/testing-library'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import {prepareAppsInTossLocale} from '../../../features/apps-in-toss-locale/prepare-apps-in-toss-locale'
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

it('should render its children only after preparation finishes', async () => {
  let resolvePreparation: (() => void) | undefined
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
  resolvePreparation?.()
  await screen.findByText('prepared child')
  expect(renderChild).toHaveBeenCalledOnce()
})

it('should mark an unmounted preparation as inactive', async () => {
  let resolvePreparation: (() => void) | undefined
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
  resolvePreparation?.()
  await Promise.resolve()
})
