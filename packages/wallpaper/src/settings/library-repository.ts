import {type PoffoConnections, poffoConnectionsSchema} from './connections'
import {toggleMenuAction} from './toggle-menu-action'
import {type ConnectionUpdateMode, mergeConnections} from './merge-connections'
import {withTrackingProfile} from './with-tracking-profile'
import Dexie, {liveQuery, type Table, type Transaction} from 'dexie'
import {DEFAULT_POFFO_VOICE, poffoVoiceSchema} from './voice'
import {DEFAULT_POFFO_LIPSYNC} from './lipsync'
import {
  poffoBindingsSchema,
  type PoffoTracking,
  type PoffoTrackingBindings,
  type PoffoTrackingOptions,
  poffoTrackingOptionsSchema,
  type PoffoTrackingProfile,
  poffoTrackingSchema,
} from './tracking'
import {
  DEFAULT_POFFO_SPEECH,
  poffoMotionSchema,
  type PoffoSpeech,
  type PoffoSpeechPosition,
  poffoSpeechSchema,
  type PoffoWidget,
  type RememberedWebsite,
  type VisitWebsiteOptions,
  type WallpaperLibrary,
  type WebsiteVisit,
  websiteVisitSchema,
  type WidgetPosition,
  widgetPositionSchema,
  type WidgetSize,
  widgetSizeSchema,
} from './library-model'

interface LibraryDatabase extends Dexie {
  readonly history: Table<WebsiteVisit, string>
  readonly websites: Table<RememberedWebsite, string>
  readonly widgets: Table<PoffoWidget, string>
}
interface CreateLibraryRepositoryOptions {
  /** Called with the asset ID for each new widget; returned connections seed its settings. Omission uses shared defaults. */
  readonly defaultConnections?: (assetId: string) => PoffoConnections | undefined
  /** Asset instantiated once when this database is first created; omission starts with no widgets. */
  readonly initialWidget?: string
}
const EXAMPLE_WEBSITE: WebsiteVisit = {url: 'https://bruno-simon.com/', visitedAt: 0}

const seedWebsiteHistory = async (transaction: Transaction) => {
  const history = transaction.table<WebsiteVisit, string>('history')
  if ((await history.get(EXAMPLE_WEBSITE.url)) === undefined) {
    await history.add(EXAMPLE_WEBSITE)
  }
}

const withSpeechDefaults = (widget: PoffoWidget): PoffoWidget => ({
  ...widget,
  speech: {
    ...DEFAULT_POFFO_SPEECH,
    ...widget.speech,
    lipsync: widget.speech?.lipsync ?? DEFAULT_POFFO_LIPSYNC,
    voice: poffoVoiceSchema.parse(widget.speech?.voice ?? DEFAULT_POFFO_VOICE),
  },
})

export interface LibraryRepository {
  readonly configureConnections: (
    id: string,
    connections: PoffoConnections,
    mode?: ConnectionUpdateMode,
  ) => Promise<void>
  /** Computes a patch from the current row in one write transaction. Use a pure synchronous callback; undefined or a removed widget skips the write. */
  readonly migrateConnections: (
    id: string,
    migrate: (widget: PoffoWidget) => PoffoConnections | undefined,
    mode?: 'replace' | 'missing',
  ) => Promise<void>
  readonly read: () => Promise<WallpaperLibrary>
  readonly visit: (options: VisitWebsiteOptions) => Promise<void>
  readonly removeVisit: (url: string) => Promise<void>
  readonly addWidget: (assetId: string) => Promise<PoffoWidget>
  readonly removeWidget: (id: string) => Promise<void>
  readonly replaceWidgets: (
    previousIds: readonly string[],
    widgets: readonly PoffoWidget[],
  ) => Promise<void>
  readonly moveWidget: (id: string, position: WidgetPosition) => Promise<void>
  readonly resizeWidget: (id: string, size: WidgetSize) => Promise<void>
  readonly trackWidget: (id: string, tracking: PoffoTracking) => Promise<void>
  readonly configureTracking: (
    id: string,
    options: PoffoTrackingOptions,
    mode?: PoffoTracking,
  ) => Promise<void>
  readonly bindWidget: (
    id: string,
    bindings: PoffoTrackingBindings,
    mode?: PoffoTracking,
  ) => Promise<void>
  readonly moveSpeech: (id: string, position: PoffoSpeechPosition) => Promise<void>
  readonly configureSpeech: (id: string, speech: PoffoSpeech) => Promise<void>
  readonly toggleWidgetAction: (id: string, bindingId: string) => Promise<void>
  readonly setWidgetMotion: (id: string, motionId: string | null | undefined) => Promise<void>
  readonly subscribe: (refresh: () => void, onError: (error: unknown) => void) => () => void
  readonly close: () => void
}

const replaceWidgetRows = (
  database: LibraryDatabase,
  previousIds: readonly string[],
  widgets: readonly PoffoWidget[],
) =>
  database.transaction('rw', database.widgets, async () => {
    await database.widgets.bulkDelete([...previousIds])
    await database.widgets.bulkPut([...widgets])
  })

/** Opens the persistent website history and independent Poffo widget library. */
export const createLibraryRepository = (
  name: string,
  options: CreateLibraryRepositoryOptions = {},
): LibraryRepository => {
  const database = new Dexie(name) as LibraryDatabase
  database.version(1).stores({history: '&url,visitedAt', websites: '&monitorId', widgets: '&id'})
  database.version(2).stores({}).upgrade(seedWebsiteHistory)
  const {initialWidget} = options
  const createWidget = (assetId: string): PoffoWidget => {
    const widget: PoffoWidget = {assetId, id: crypto.randomUUID(), x: null, y: null}
    const connections = options.defaultConnections?.(assetId)
    return connections === undefined
      ? widget
      : mergeConnections({
          connections: poffoConnectionsSchema.parse(connections),
          mode: 'replace',
          widget,
        })
  }
  database.on('populate', async (transaction) => {
    await seedWebsiteHistory(transaction)
    if (initialWidget !== undefined) {
      if (initialWidget.trim() === '') {
        throw new Error('Poffo asset is required')
      }
      await transaction.table('widgets').add(createWidget(initialWidget))
    }
  })
  const read = async (): Promise<WallpaperLibrary> => {
    const [history, websites, widgets] = await Promise.all([
      database.history.orderBy('visitedAt').reverse().toArray(),
      database.websites.toArray(),
      database.widgets.toArray(),
    ])
    return {
      history,
      websites,
      widgets: widgets.map(withSpeechDefaults),
    }
  }
  const configureProfile = (id: string, patch: PoffoTrackingProfile, mode?: PoffoTracking) =>
    database.transaction('rw', database.widgets, async () => {
      const widget = await database.widgets.get(id)
      if (widget !== undefined) {
        const input = poffoTrackingSchema.parse(mode ?? widget.tracking ?? 'off')
        await database.widgets.update(id, {
          trackingProfiles: withTrackingProfile(widget, patch, input),
        })
      }
    })
  return {
    async addWidget(assetId) {
      if (assetId.trim() === '') {
        throw new Error('Poffo asset is required')
      }
      const widget = createWidget(assetId)
      await database.widgets.add(widget)
      return widget
    },
    async bindWidget(id, bindings, mode) {
      await configureProfile(id, {bindings: poffoBindingsSchema.parse(bindings)}, mode)
    },
    close: () => database.close(),
    async configureConnections(id, connections, mode = 'merge') {
      const parsed = poffoConnectionsSchema.parse(connections)
      await database.transaction('rw', database.widgets, async () => {
        const widget = await database.widgets.get(id)
        if (widget === undefined) {
          throw new Error('Poffo widget is unavailable')
        }
        await database.widgets.put(mergeConnections({connections: parsed, mode, widget}))
      })
    },
    async configureSpeech(id, speech) {
      await database.widgets.update(id, {speech: poffoSpeechSchema.parse(speech)})
    },
    async configureTracking(id, options, mode) {
      await configureProfile(id, {options: poffoTrackingOptionsSchema.parse(options)}, mode)
    },
    async migrateConnections(id, migrate, mode = 'replace') {
      await database.transaction('rw', database.widgets, async () => {
        const widget = await database.widgets.get(id)
        const connections = widget === undefined ? undefined : migrate(widget)
        if (widget !== undefined && connections !== undefined) {
          const parsed = poffoConnectionsSchema.parse(connections)
          await database.widgets.put(mergeConnections({connections: parsed, mode, widget}))
        }
      })
    },
    async moveSpeech(id, position) {
      const point = poffoSpeechSchema.pick({anchor: true, x: true, y: true}).parse(position)
      await database.transaction('rw', database.widgets, async () => {
        const widget = await database.widgets.get(id)
        if (widget === undefined) {
          throw new Error('Poffo widget is unavailable')
        }
        await database.widgets.update(id, {
          speech: poffoSpeechSchema.parse({...DEFAULT_POFFO_SPEECH, ...widget.speech, ...point}),
        })
      })
    },
    async moveWidget(id, position) {
      await database.widgets.update(id, widgetPositionSchema.parse(position))
    },
    read,
    async removeVisit(url) {
      await database.history.delete(url)
    },
    async removeWidget(id) {
      await database.widgets.delete(id)
    },
    replaceWidgets: (previousIds, widgets) => replaceWidgetRows(database, previousIds, widgets),
    async resizeWidget(id, size) {
      await database.widgets.update(id, {size: widgetSizeSchema.parse(size)})
    },
    async setWidgetMotion(id, motionId) {
      await database.widgets.update(id, {motionId: poffoMotionSchema.parse(motionId)})
    },
    subscribe(refresh, onError) {
      const subscription = liveQuery(read).subscribe({error: onError, next: refresh})
      return () => subscription.unsubscribe()
    },
    async toggleWidgetAction(id, bindingId) {
      await database.transaction('rw', database.widgets, async () => {
        const widget = await database.widgets.get(id)
        const bindings = widget?.speech?.semanticBindings
        if (widget === undefined || bindings === undefined) {
          return
        }
        const next = toggleMenuAction(bindings, bindingId)
        if (next !== bindings) {
          await database.widgets.update(id, {speech: {...widget.speech!, semanticBindings: next}})
        }
      })
    },
    async trackWidget(id, tracking) {
      await database.widgets.update(id, {tracking: poffoTrackingSchema.parse(tracking)})
    },
    async visit(options) {
      const {monitorId, url, visitedAt} = websiteVisitSchema.parse(options)
      await database.transaction('rw', database.history, database.websites, async () => {
        await database.history.put({url, visitedAt})
        await database.websites.put({monitorId, url})
      })
    },
  }
}
