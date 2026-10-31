import Dexie, {liveQuery, type Table} from 'dexie'
import {poffoVoiceSchema} from './voice'
import {
  poffoBindingsSchema,
  type PoffoTracking,
  type PoffoTrackingBindings,
  type PoffoTrackingOptions,
  poffoTrackingOptionsSchema,
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
export interface LibraryRepository {
  readonly read: () => Promise<WallpaperLibrary>
  readonly visit: (options: VisitWebsiteOptions) => Promise<void>
  readonly removeVisit: (url: string) => Promise<void>
  readonly addWidget: (assetId: string) => Promise<PoffoWidget>
  readonly removeWidget: (id: string) => Promise<void>
  readonly moveWidget: (id: string, position: WidgetPosition) => Promise<void>
  readonly resizeWidget: (id: string, size: WidgetSize) => Promise<void>
  readonly trackWidget: (id: string, tracking: PoffoTracking) => Promise<void>
  readonly configureTracking: (id: string, options: PoffoTrackingOptions) => Promise<void>
  readonly bindWidget: (id: string, bindings: PoffoTrackingBindings) => Promise<void>
  readonly moveSpeech: (id: string, position: PoffoSpeechPosition) => Promise<void>
  readonly configureSpeech: (id: string, speech: PoffoSpeech) => Promise<void>
  readonly setWidgetMotion: (id: string, motionId: string | null | undefined) => Promise<void>
  readonly subscribe: (refresh: () => void, onError: (error: unknown) => void) => () => void
  readonly close: () => void
}

/** Opens the persistent website history and independent Poffo widget library. */
export const createLibraryRepository = (name: string): LibraryRepository => {
  const database = new Dexie(name) as LibraryDatabase
  database.version(1).stores({history: '&url,visitedAt', websites: '&monitorId', widgets: '&id'})
  const read = async (): Promise<WallpaperLibrary> => {
    const [history, websites, widgets] = await Promise.all([
      database.history.orderBy('visitedAt').reverse().toArray(),
      database.websites.toArray(),
      database.widgets.toArray(),
    ])
    return {
      history,
      websites,
      widgets: widgets.map((widget) => {
        const {speech} = widget
        return speech?.voice === undefined
          ? widget
          : {...widget, speech: {...speech, voice: poffoVoiceSchema.parse(speech.voice)}}
      }),
    }
  }
  return {
    async addWidget(assetId) {
      if (assetId.trim() === '') {
        throw new Error('Poffo asset is required')
      }
      const widget: PoffoWidget = {assetId, id: crypto.randomUUID(), x: null, y: null}
      await database.widgets.add(widget)
      return widget
    },
    async bindWidget(id, bindings) {
      await database.widgets.update(id, {trackingBindings: poffoBindingsSchema.parse(bindings)})
    },
    close: () => database.close(),
    async configureSpeech(id, speech) {
      await database.widgets.update(id, {speech: poffoSpeechSchema.parse(speech)})
    },
    async configureTracking(id, options) {
      await database.widgets.update(id, {
        trackingOptions: poffoTrackingOptionsSchema.parse(options),
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
