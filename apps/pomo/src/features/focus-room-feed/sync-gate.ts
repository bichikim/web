export interface FeedSyncGate {
  isActive: boolean
  isRequested: boolean
}

export const createFeedSyncGate = (): FeedSyncGate => ({isActive: false, isRequested: false})

export const beginFeedSync = (gate: FeedSyncGate) => {
  if (gate.isActive) {
    gate.isRequested = true
    return false
  }

  gate.isActive = true
  return true
}

export const finishFeedSync = (gate: FeedSyncGate) => {
  gate.isActive = false
  const {isRequested} = gate
  gate.isRequested = false
  return isRequested
}
