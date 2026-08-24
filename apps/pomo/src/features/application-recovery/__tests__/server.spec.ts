import {expect, it, vi} from 'vitest'

vi.mock('solid-js/web', () => ({isServer: true}))

import {useApplicationRecovery} from '..'

it('should create an error ID without reporting during server rendering', () => {
  const createErrorId = vi.fn(() => 'POMO-SERVER')
  const reportError = vi.fn(() => 'POMO-REPORTED')
  const recovery = useApplicationRecovery({createErrorId, reportError})

  expect(recovery.onError(new Error('server render failure'))).toBe('POMO-SERVER')
  expect(createErrorId).toHaveBeenCalledOnce()
  expect(reportError).not.toHaveBeenCalled()
})
