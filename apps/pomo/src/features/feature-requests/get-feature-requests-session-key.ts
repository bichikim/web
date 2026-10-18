import type {AuthenticationState} from '../auth/machine'

const sessionKeys = new WeakMap<AuthenticationState, string>()
let nextSessionKey = 0

/** Shares an opaque cache scope only among consumers of the same resolved auth state. */
export const getFeatureRequestsSessionKey = (state: AuthenticationState): string => {
  const existing = sessionKeys.get(state)
  if (existing !== undefined) {
    return existing
  }
  nextSessionKey += 1
  const key = `session-${nextSessionKey}`
  sessionKeys.set(state, key)
  return key
}
