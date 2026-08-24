export type AdminAccess = 'admin' | 'anonymous' | 'forbidden' | 'invalid'

const ADMIN_ROLE = 'admin'

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === 'object' && value !== null

export const hasAdminRole = (role: unknown): boolean => {
  if (typeof role === 'string') {
    return role.split(',').some((value) => value.trim() === ADMIN_ROLE)
  }

  return Array.isArray(role) && role.some((value) => value === ADMIN_ROLE)
}

export const classifyAdminAccess = (sessionData: unknown): AdminAccess => {
  if (sessionData === null) {
    return 'anonymous'
  }

  if (!isRecord(sessionData)) {
    return 'invalid'
  }

  const {session, user} = sessionData

  if (session === null && user === null) {
    return 'anonymous'
  }

  if (!isRecord(session) || !isRecord(user)) {
    return 'invalid'
  }

  return hasAdminRole(user.role) ? 'admin' : 'forbidden'
}
