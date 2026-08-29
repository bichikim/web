/** @vitest-environment jsdom */

import {afterEach, expect, it, vi} from 'vitest'

const reporterMocks = vi.hoisted(() => ({
  createErrorId: vi.fn(() => 'POMO-DEFAULT'),
  reportError: vi.fn(() => 'POMO-REPORTED'),
}))

vi.mock('../../client-error-reporter', () => ({
  createClientErrorId: reporterMocks.createErrorId,
  reportClientError: reporterMocks.reportError,
}))

import {useApplicationRecovery} from '../use-application-recovery'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

it('should use the default browser reporter and reload behavior', () => {
  const reload = vi.fn()
  vi.stubGlobal('window', {location: {reload}})
  const recovery = useApplicationRecovery()
  const error = new Error('render failure')

  expect(recovery.onError(error)).toBe('POMO-REPORTED')
  expect(reporterMocks.reportError).toHaveBeenCalledWith(error, {
    feature: 'application',
    source: 'error-boundary',
  })
  recovery.onReload()
  expect(reload).toHaveBeenCalledOnce()
})

it('should use the default error ID when reporting throws', () => {
  const recovery = useApplicationRecovery({
    reportError: () => {
      throw new Error('reporting unavailable')
    },
  })

  expect(recovery.onError(new Error('render failure'))).toBe('POMO-DEFAULT')
  expect(reporterMocks.createErrorId).toHaveBeenCalledOnce()
})
