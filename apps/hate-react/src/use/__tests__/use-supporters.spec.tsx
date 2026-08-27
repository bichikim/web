/** @vitest-environment jsdom */

import {render, waitFor} from '@solidjs/testing-library'
import {afterEach, describe, expect, it, vi} from 'vitest'
import {useSupporters} from '../use-supporters'

describe('useSupporters', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('should expose supporter messages from the API', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({json: () => ({messages: ['One', 'Two']}), ok: true}),
    )
    const Probe = () => {
      const supporters = useSupporters()

      return <p>{supporters()?.join(',')}</p>
    }
    const view = render(() => <Probe />)

    await waitFor(() => expect(view.getByText('One,Two')).toBeDefined())
  })

  it('should expose a failed response through the resource error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ok: false, status: 503}))
    let resource: ReturnType<typeof useSupporters> | undefined
    const Probe = () => {
      resource = useSupporters()

      return null
    }
    render(() => <Probe />)

    await waitFor(() =>
      expect(resource?.error).toEqual(new Error('Failed to fetch supporters: 503')),
    )
  })
})
