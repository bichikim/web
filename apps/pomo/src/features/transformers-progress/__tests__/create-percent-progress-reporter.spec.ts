import {expect, it, vi} from 'vitest'

import {createPercentProgressReporter} from '../create-percent-progress-reporter'

it('should emit rounded percentages only for progress_total updates', () => {
  const onPercent = vi.fn()
  const report = createPercentProgressReporter(onPercent)

  report({status: 'download'} as never)
  for (const progress of [-10, 33.6, 110]) {
    report({files: {}, loaded: 0, name: 'model', progress, status: 'progress_total', total: 100})
  }

  expect(onPercent.mock.calls).toEqual([[0], [34], [100]])
})
