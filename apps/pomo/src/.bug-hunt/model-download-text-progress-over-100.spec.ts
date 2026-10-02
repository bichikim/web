/** @vitest-environment node */
import {createRoot} from 'solid-js'
import {expect, it, vi} from 'vitest'

import {createDownloadQueue} from '../features/model-download/queue'

it('should cap user-facing download percentage at 100 when byte totals are underestimated', () => {
  createRoot((dispose) => {
    const queue = createDownloadQueue()
    queue.start({
      createClient: (callbacks) => ({
        dispose: vi.fn(),
        prepare: () => {
          callbacks.onProgress(120)
        },
      }),
      label: 'Gemma 4 E2B',
      target: {kind: 'text', modelId: 'gemma-4-e2b'},
    })

    const state = queue.state()
    expect(state.status).toBe('loading')
    if (state.status !== 'loading') {
      throw new Error('Expected a loading download state.')
    }

    expect(state.percentage).toBeLessThanOrEqual(100)
    expect(Number.isFinite(state.percentage)).toBe(true)
    dispose()
  })
})
