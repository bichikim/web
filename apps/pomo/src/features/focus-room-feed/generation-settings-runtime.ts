import {feedGenerationRuntime} from './generation-runtime'
import {resolveGenerationSettings} from './generation-settings'
import {createFeedConnectionRepository} from './repository'

/** Resolves feed generation settings from browser storage at the moment it is called. */
export const resolveCurrentGenerationSettings = (connectionId: string) => {
  const storage = window.localStorage
  return resolveGenerationSettings({
    connectionId,
    connectionRepository: createFeedConnectionRepository(storage),
    loadAutomaticSettings: feedGenerationRuntime.loadAutomaticDialogueSettings,
    storage,
  })
}
