import {feedSettingsRuntime} from './settings-runtime'

/** Resolves feed generation settings from browser storage at the moment it is called. */
export const resolveCurrentGenerationSettings = (connectionId: string) =>
  feedSettingsRuntime.resolveGeneration(connectionId)
