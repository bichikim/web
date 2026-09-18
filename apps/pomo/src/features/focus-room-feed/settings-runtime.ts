import type {AutomaticDialogueSettings} from '../focus-room-dialogue/automatic-dialogue-settings-contract'
import {feedGenerationRuntime} from './generation-runtime'
import {type FeedGenerationSettings, resolveGenerationSettings} from './generation-settings'
import {
  createFeedConnectionRepository,
  type FeedConnectionRepository,
  type FeedConnectionStorage,
} from './repository'

export interface FeedSettingsRuntime {
  readonly listConnections: FeedConnectionRepository['list']
  readonly createConnections: () => FeedConnectionRepository
  readonly resolveGeneration: (
    connectionId: string,
    settings?: AutomaticDialogueSettings,
  ) => Promise<FeedGenerationSettings | null>
}

/** Composes feed connections and generation settings over the same browser storage boundary. */
export const createFeedSettingsRuntime = (storage: FeedConnectionStorage): FeedSettingsRuntime => ({
  createConnections: () => createFeedConnectionRepository(storage),
  listConnections: () => createFeedConnectionRepository(storage).list(),
  resolveGeneration: (connectionId, settings) =>
    resolveGenerationSettings({
      connectionId,
      connectionRepository: createFeedConnectionRepository(storage),
      loadAutomaticSettings:
        settings === undefined
          ? feedGenerationRuntime.loadAutomaticDialogueSettings
          : () => Promise.resolve(settings),
      storage,
    }),
})

export const feedSettingsRuntime = createFeedSettingsRuntime({
  getItem: (key) => localStorage.getItem(key),
  setItem: (key, value) => localStorage.setItem(key, value),
})
