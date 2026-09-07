/** @vitest-environment jsdom */

import {afterEach, describe, expect, it, vi} from 'vitest'

import {requestAdminMagicLink} from '../../admin-auth/magic-link'
import {signOutAdminSession} from '../../admin-auth/session'
import {requestUserMagicLink} from '../../user-auth/magic-link'
import {signOutWebSession} from '../../user-auth/web-session'

const calendarMocks = vi.hoisted(() => ({clearCalendarMonthCache: vi.fn()}))

vi.mock('@solidjs/router', () => ({action: vi.fn((callback) => callback)}))
vi.mock('../../admin-auth/magic-link', () => ({requestAdminMagicLink: vi.fn()}))
vi.mock('../../admin-auth/session', () => ({signOutAdminSession: vi.fn()}))
vi.mock('../../user-auth/magic-link', () => ({requestUserMagicLink: vi.fn()}))
vi.mock('../../user-auth/web-session', () => ({signOutWebSession: vi.fn()}))
vi.mock('../../calendar', () => calendarMocks)

import {
  requestAccountMagicLinkAction,
  requestAdminMagicLinkAction,
  signOutAccountSessionAction,
  signOutAdminSessionAction,
} from '../actions'

afterEach(() => {
  vi.clearAllMocks()
})

describe('magic-link actions', () => {
  it('should adapt account form values to the existing browser request', async () => {
    window.history.replaceState(null, '', '/account')
    vi.mocked(requestUserMagicLink).mockResolvedValue(true)

    await expect(
      requestAccountMagicLinkAction(new URLSearchParams({email: ' user@example.com '})),
    ).resolves.toEqual({status: 'sent'})
    expect(requestUserMagicLink).toHaveBeenCalledWith({
      email: 'user@example.com',
      origin: window.location.origin,
    })
  })

  it('should distinguish invalid, rejected, and unavailable admin requests', async () => {
    await expect(requestAdminMagicLinkAction(new URLSearchParams())).resolves.toEqual({
      status: 'rejected',
    })
    expect(requestAdminMagicLink).not.toHaveBeenCalled()

    vi.mocked(requestAdminMagicLink)
      .mockResolvedValueOnce(false)
      .mockRejectedValueOnce(new Error('Network unavailable'))

    await expect(
      requestAdminMagicLinkAction(new URLSearchParams({email: 'admin@example.com'})),
    ).resolves.toEqual({status: 'rejected'})
    await expect(
      requestAdminMagicLinkAction(new URLSearchParams({email: 'admin@example.com'})),
    ).resolves.toEqual({status: 'unavailable'})
  })
})

describe('sign-out actions', () => {
  it('should preserve account sign-out success and administrator rejection', async () => {
    vi.mocked(signOutWebSession).mockResolvedValue(true)
    vi.mocked(signOutAdminSession).mockResolvedValue(false)

    await expect(signOutAccountSessionAction(new URLSearchParams())).resolves.toEqual({
      status: 'signed-out',
    })
    expect(calendarMocks.clearCalendarMonthCache).toHaveBeenCalledOnce()
    await expect(signOutAdminSessionAction(new URLSearchParams())).resolves.toEqual({
      status: 'rejected',
    })
  })

  it('should normalize browser request failures', async () => {
    vi.mocked(signOutWebSession).mockRejectedValue(new Error('Network unavailable'))

    await expect(signOutAccountSessionAction(new URLSearchParams())).resolves.toEqual({
      status: 'unavailable',
    })
    expect(calendarMocks.clearCalendarMonthCache).not.toHaveBeenCalled()
  })
})
