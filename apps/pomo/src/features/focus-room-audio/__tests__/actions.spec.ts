import {beforeEach, expect, it, vi} from 'vitest'

const accessMocks = vi.hoisted(() => ({requestTrackAccess: vi.fn()}))

vi.mock('@solidjs/router', () => ({action: vi.fn((clientAction) => clientAction)}))
vi.mock('../track-preview-access', () => accessMocks)

import {requestTrackAccessAction} from '../actions'

beforeEach(() => {
  vi.resetAllMocks()
})

it('should preserve granted and authentication-required access states', async () => {
  const access = {expiresAt: '2026-09-02T12:00:00.000Z', mode: 'full', url: 'https://audio.test'}
  accessMocks.requestTrackAccess.mockResolvedValueOnce(access).mockResolvedValueOnce(null)

  await expect(requestTrackAccessAction('track-one')).resolves.toEqual({
    access,
    status: 'granted',
  })
  await expect(requestTrackAccessAction('track-two')).resolves.toEqual({
    status: 'authentication-required',
  })
})

it('should normalize an access transport failure', async () => {
  accessMocks.requestTrackAccess.mockRejectedValueOnce(new Error('offline'))

  await expect(requestTrackAccessAction('track-one')).resolves.toEqual({status: 'unavailable'})
})
