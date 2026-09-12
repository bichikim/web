import {query} from '@solidjs/router'

import {
  activateStoredSession,
  clearStoredAppSession,
  readStoredAppSession,
  validateAppSession,
} from './app-session'
import {readAccountSession} from './web-session'

export const accountSessionQuery = query(readAccountSession, 'user-account-session')

const readTossSession = async (): Promise<boolean> => {
  const token = await readStoredAppSession()

  if (token === null) {
    return false
  }

  if ((await validateAppSession(token)) || (await activateStoredSession(token))) {
    return true
  }

  try {
    await clearStoredAppSession()
  } catch (error: unknown) {
    console.error('Failed to clear invalid Toss session from storage', error)
  }

  return false
}

export const tossSessionQuery = query(readTossSession, 'toss-user-account-session')
