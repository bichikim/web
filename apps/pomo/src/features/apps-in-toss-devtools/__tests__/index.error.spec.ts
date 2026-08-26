/** @vitest-environment jsdom */

import {renderHook, waitFor} from '@solidjs/testing-library'
import {afterEach, expect, it, vi} from 'vitest'

const panelError = vi.hoisted(() => new Error('panel failed'))

vi.mock('@ait-co/devtools/panel', () => {
  throw panelError
})

import {useAppsInTossDevtools} from '../index'

afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

it('should report panel loading failures', async () => {
  vi.stubEnv('DEV', true)
  vi.stubEnv('POMO_HAS_APPS_IN_TOSS_DEVTOOLS', '1')
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
  renderHook(useAppsInTossDevtools)

  await waitFor(() =>
    expect(consoleError).toHaveBeenCalledWith(
      'Failed to load Apps in Toss DevTools.',
      expect.objectContaining({cause: panelError}),
    ),
  )
})
