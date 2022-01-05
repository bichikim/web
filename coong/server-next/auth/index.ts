/* eslint-disable prefer-destructuring */
/*
Welcome to the auth file! Here we have put a config to do basic auth in Keystone.

`createAuth` is an implementation for an email-password login out of the box.
`statelessSessions` is a base implementation of session logic.

For more on auth, check out: https://keystonejs.com/docs/apis/auth#authentication-api
*/

import {createAuth} from '@keystone-6/auth'
import {resolveUrl} from '@winter-love/utils'
import {createPasswordResetLink} from './password-reset-link'
import {createMagicAuthLink} from './magic-auth-link'

// See https://keystonejs.com/docs/apis/session#session-api for the session docs
import {statelessSessions} from '@keystone-6/core/session'

let SESSION_SECRET = process.env.SESSION_SECRET
const SUPPORT_EMAIL_ADDRESS = process.env.SUPPORT_EMAIL_ADDRESS ?? 'support@coong.io'
const WEB_URL = process.env.WEB_URL ?? 'https://coong.io'
const RESET_PASSWORD_PATH = process.env.RESET_PASSWORD_PATH ?? 'reset-password'
const MAGIC_AUTH_LINK_PATH = process.env.MAGIC_AUTH_LINK_PATH ?? 'magic-auth-link'

// This defines how long people will remain logged in for.
// This will get refreshed when they log back in.
// 30 days
// eslint-disable-next-line no-magic-numbers
const SESSION_MAX_AGE = 60 * 60 * 24 * 30

// Here is a best practice! It's fine to not have provided a session secret in dev,
// however it should always be there in production.
if (!SESSION_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'The SESSION_SECRET environment variable must be set in production',
    )
  } else {
    SESSION_SECRET = '-- DEV COOKIE SECRET; CHANGE ME --'
  }
}

/**
 * 30 min
 */
// eslint-disable-next-line no-magic-numbers
const PASSWORD_RESET_TOKEN_MAX_AGE = 60 * 30
// eslint-disable-next-line no-magic-numbers
const MAGIC_AUTH_LINK_TOKEN_MAX_AGE = 60 * 5

// Here we define how auth relates to our schemas.
// What we are saying here is that we want to use the list `User`, and to log in
// we will need their email and password.
const {withAuth} = createAuth({
  identityField: 'email',
  initFirstItem: {
    // If there are no items in the database, keystone will ask you to create
    // a new user, filling in these fields.
    fields: ['name', 'email', 'password'],
  },
  listKey: 'User',
  magicAuthLink: createMagicAuthLink({
    from: SUPPORT_EMAIL_ADDRESS,
    link: resolveUrl(WEB_URL, MAGIC_AUTH_LINK_PATH),
    tokensValidForMins: MAGIC_AUTH_LINK_TOKEN_MAX_AGE,
  }),
  passwordResetLink: createPasswordResetLink({
    from: SUPPORT_EMAIL_ADDRESS,
    link: resolveUrl(WEB_URL, RESET_PASSWORD_PATH),
    tokensValidForMins: PASSWORD_RESET_TOKEN_MAX_AGE,
  }),
  secretField: 'password',
  sessionData: 'name roles email isAdmin',
})

// This defines how sessions should work. For more details, check out: https://keystonejs.com/docs/apis/session#session-api
const session = statelessSessions({
  maxAge: SESSION_MAX_AGE,
  secret: SESSION_SECRET,
})

export {withAuth, session}
