import {describe, expect, it, vi} from 'vitest'
import {createLocationSynchronizer} from '../create-location-synchronizer'
import type {ViewerPort} from '../types'
import type {ViewerSession} from '../../shared/contracts'

const session: ViewerSession = {
  document: {lines: [], location: {column: 1, line: 1, path: 'main.ts'}, revision: '1', source: ''},
  session: 'session',
  workspace: '/project',
}
const port = (): ViewerPort => ({
  call: vi.fn(),
  context: vi.fn(),
  location: vi.fn().mockResolvedValue(undefined),
  start: vi.fn(),
})

describe('createLocationSynchronizer', () => {
  it('should avoid native updates for selection changes and allow retry after a failure', async () => {
    const host = port()
    const report = vi.fn()
    const failure = new Error('tab unavailable')
    vi.mocked(host.location!).mockRejectedValueOnce(failure)
    const synchronize = createLocationSynchronizer({port: host, report})
    synchronize(session)
    await Promise.resolve()
    expect(report).toHaveBeenCalledWith(failure)
    synchronize(session)
    synchronize({
      ...session,
      document: {...session.document, location: {...session.document.location, line: 5}},
    })
    expect(host.location).toHaveBeenCalledTimes(2)
  })
  it('should not reset a newer location when an earlier update fails', async () => {
    const host = port()
    const pending = Promise.withResolvers<void>()
    vi.mocked(host.location!).mockReturnValueOnce(pending.promise)
    const synchronize = createLocationSynchronizer({port: host, report: vi.fn()})
    synchronize(session)
    const next = {
      ...session,
      document: {...session.document, location: {...session.document.location, path: 'next.ts'}},
    }
    synchronize(next)
    pending.reject(new Error('old request failed'))
    await Promise.resolve()
    synchronize(next)
    expect(host.location).toHaveBeenCalledTimes(2)
  })
})
