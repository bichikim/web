import Dexie, {liveQuery, type Table} from 'dexie'
import {type MonitorWallpaper, monitorWallpaperSchema} from './model'

export interface PuppetAsset {
  readonly id: string
  readonly name: string
}
interface StoredPuppet extends PuppetAsset {
  readonly source: string
}
interface SettingsDatabase extends Dexie {
  readonly monitors: Table<MonitorWallpaper, string>
  readonly puppets: Table<StoredPuppet, string>
}
export interface SettingsRepository {
  readonly read: () => Promise<readonly MonitorWallpaper[]>
  readonly save: (settings: MonitorWallpaper) => Promise<void>
  readonly addPuppet: (name: string, source: string) => Promise<PuppetAsset>
  readonly listPuppets: () => Promise<readonly PuppetAsset[]>
  readonly loadPuppet: (id: string) => Promise<string>
  /** Removes an item from all monitor album selections in one transaction. */
  readonly removeMediaReferences: (id: string) => Promise<void>
  readonly removePuppet: (id: string) => Promise<void>
  readonly subscribe: (refresh: () => void, onError: (error: unknown) => void) => () => void
  readonly close: () => void
}

/** Opens local monitor settings and Puppet sources; the caller owns closing the repository. */
export const createSettingsRepository = (databaseName: string): SettingsRepository => {
  const database = new Dexie(databaseName) as SettingsDatabase
  database.version(1).stores({monitors: '&monitorId', puppets: '&id'})
  const read = async () =>
    (await database.monitors.toArray()).map((value) => monitorWallpaperSchema.parse(value))
  return {
    async addPuppet(name, source) {
      const id = crypto.randomUUID()
      await database.puppets.add({id, name, source})
      return {id, name}
    },
    close: () => database.close(),
    listPuppets: async () => (await database.puppets.toArray()).map(({id, name}) => ({id, name})),
    async loadPuppet(id) {
      const puppet = await database.puppets.get(id)
      if (puppet === undefined) {
        throw new Error('Puppet asset is missing.')
      }
      return puppet.source
    },
    read,
    async removeMediaReferences(id) {
      await database.transaction('rw', database.monitors, async () => {
        const monitors = await read()
        await Promise.all(
          monitors.map((monitor) => {
            const {content} = monitor
            return content.mode === 'album' && content.mediaIds.includes(id)
              ? database.monitors.put({
                  ...monitor,
                  content: {
                    ...content,
                    mediaIds: content.mediaIds.filter((selected) => selected !== id),
                  },
                })
              : Promise.resolve()
          }),
        )
      })
    },
    async removePuppet(id) {
      await database.transaction('rw', database.monitors, database.puppets, async () => {
        const monitors = await read()
        await database.puppets.delete(id)
        await Promise.all(
          monitors
            .filter(
              (monitor) => monitor.content.mode === 'puppet' && monitor.content.assetId === id,
            )
            .map((monitor) =>
              database.monitors.put({...monitor, content: {assetId: null, mode: 'puppet'}}),
            ),
        )
      })
    },
    async save(settings) {
      await database.monitors.put(monitorWallpaperSchema.parse(settings))
    },
    subscribe(refresh, onError) {
      const subscription = liveQuery(async () => ({
        monitors: await read(),
        puppets: await database.puppets.toArray(),
      })).subscribe({error: onError, next: refresh})
      return () => subscription.unsubscribe()
    },
  }
}
