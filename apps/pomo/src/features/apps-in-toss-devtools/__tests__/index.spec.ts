/** @vitest-environment jsdom */

import {renderHook, waitFor} from '@solidjs/testing-library'
import {afterEach, expect, it, vi} from 'vitest'

const panelLoaded = vi.hoisted(() => vi.fn())

vi.mock('@ait-co/devtools/panel', () => {
  panelLoaded()
  return {}
})

import {useAppsInTossDevtools} from '../index'

afterEach(() => {
  vi.unstubAllEnvs()
})

it('should skip loading outside development and without the panel feature', async () => {
  vi.stubEnv('DEV', false)
  vi.stubEnv('POMO_HAS_APPS_IN_TOSS_DEVTOOLS', '1')
  renderHook(useAppsInTossDevtools)

  await Promise.resolve()
  expect(panelLoaded).not.toHaveBeenCalled()

  vi.stubEnv('DEV', true)
  vi.stubEnv('POMO_HAS_APPS_IN_TOSS_DEVTOOLS', '')
  renderHook(useAppsInTossDevtools)
  await Promise.resolve()
  expect(panelLoaded).not.toHaveBeenCalled()
})

it('should load the Apps in Toss panel after mounting in its development runtime', async () => {
  vi.stubEnv('DEV', true)
  vi.stubEnv('POMO_HAS_APPS_IN_TOSS_DEVTOOLS', '1')
  renderHook(useAppsInTossDevtools)

  await waitFor(() => expect(panelLoaded).toHaveBeenCalledOnce())
})
