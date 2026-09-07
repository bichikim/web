import {action} from '@solidjs/router'

import {clearCalendarMonthCache} from '../calendar'
import {requestAdminMagicLink} from '../admin-auth/magic-link'
import {signOutAdminSession} from '../admin-auth/session'
import {requestUserMagicLink} from '../user-auth/magic-link'
import {signOutWebSession} from '../user-auth/web-session'

export type MagicLinkActionResult =
  | {readonly status: 'rejected'}
  | {readonly status: 'sent'}
  | {readonly status: 'unavailable'}

export type SignOutActionResult =
  | {readonly status: 'rejected'}
  | {readonly status: 'signed-out'}
  | {readonly status: 'unavailable'}

interface MagicLinkInput {
  readonly email: string
  readonly origin: string
}

type FormValues = FormData | URLSearchParams

const getEmail = (values: FormValues): string | null => {
  const email = values.get('email')?.toString().trim()

  return email && email.length > 0 ? email : null
}

const requestMagicLink = async (
  values: FormValues,
  request: (input: MagicLinkInput) => Promise<boolean>,
): Promise<MagicLinkActionResult> => {
  const email = getEmail(values)

  if (email === null) {
    return {status: 'rejected'}
  }

  try {
    const wasSent = await request({email, origin: window.location.origin})

    return {status: wasSent ? 'sent' : 'rejected'}
  } catch {
    return {status: 'unavailable'}
  }
}

const signOut = async (request: () => Promise<boolean>): Promise<SignOutActionResult> => {
  try {
    const wasSignedOut = await request()

    return {status: wasSignedOut ? 'signed-out' : 'rejected'}
  } catch {
    return {status: 'unavailable'}
  }
}

const signOutAccount = async (): Promise<SignOutActionResult> => {
  const result = await signOut(signOutWebSession)
  if (result.status === 'signed-out') {
    clearCalendarMonthCache()
  }
  return result
}

export const requestAccountMagicLinkAction = action(
  (values: FormValues) => requestMagicLink(values, requestUserMagicLink),
  'request-account-magic-link',
)
export const requestAdminMagicLinkAction = action(
  (values: FormValues) => requestMagicLink(values, requestAdminMagicLink),
  'request-admin-magic-link',
)
export const signOutAccountSessionAction = action(
  (_values: FormValues) => signOutAccount(),
  'sign-out-account-session',
)
export const signOutAdminSessionAction = action(
  (_values: FormValues) => signOut(signOutAdminSession),
  'sign-out-admin-session',
)
