/** @vitest-environment node */
import {expect, it, vi} from 'vitest'

import {createClientErrorReporter} from 'src/features/client-error-reporter/reporter'

it('should report in a server runtime without accessing browser globals', () => {
  const send = vi.fn()
  const reporter = createClientErrorReporter({createId: () => 'POMO-SERVER', send})

  expect(() =>
    reporter.report(new Error('server render failure'), {
      feature: 'application',
      source: 'error-boundary',
    }),
  ).not.toThrow()
  expect(send).toHaveBeenCalledWith(
    expect.objectContaining({
      errorId: 'POMO-SERVER',
      route: {origin: 'server', template: '/unknown'},
    }),
  )
})
