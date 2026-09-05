import {createMemo, createSignal, onCleanup, onMount, Show, untrack} from 'solid-js'

import * as m from '@paraglide/message'
import {
  createPictureDiaryEntry,
  createPictureDiaryRepository,
  type PictureDiaryEntry,
  type PictureDiaryImage,
  type PictureDiaryRepository,
  type PictureDiaryStroke,
  type PictureDiaryWeather,
  sortPictureDiaryEntries,
} from '../../features/picture-diary'
import type {WeatherState} from '../../features/weather'
import {type BookSpread, getBookPagination} from './picture-diary/pagination'
import {PictureDiaryEditor} from './picture-diary/Editor'
import {useEntryEditing} from './picture-diary/use-entry-editing'
import type {PageTurnEnvironment} from './picture-diary/turn-environment'
import {
  createBrowserDiaryEnvironment,
  type PictureDiaryEnvironment,
} from './picture-diary/environment'

const padNumber = (value: number) => String(value).padStart(2, '0')
const getDateValue = (date: Date) =>
  `${date.getFullYear()}-${padNumber(date.getMonth() + 1)}-${padNumber(date.getDate())}`

export interface PictureDiaryProps {
  readonly turnEnvironment?: PageTurnEnvironment
  readonly environment?: PictureDiaryEnvironment
  readonly repository?: PictureDiaryRepository
  readonly weatherState?: WeatherState
}

interface PictureDiaryBackCoverView {
  readonly kind: 'back-cover' | 'front-cover'
}

interface PictureDiaryEntryView {
  readonly id: string
  readonly kind: 'entry'
}

interface PictureDiaryWritingView {
  readonly kind: 'writing' | 'ending'
}

type PictureDiaryView = PictureDiaryBackCoverView | PictureDiaryEntryView | PictureDiaryWritingView

const getSpreadView = (spread: BookSpread): PictureDiaryView => {
  if (spread.left.kind !== 'writing' && spread.right.kind === 'cover') {
    return {kind: 'ending'}
  }
  const page = spread.left.kind === 'writing' ? spread.left : spread.right
  return page.kind === 'entry' ? {id: page.entry.id, kind: 'entry'} : {kind: 'writing'}
}

const getViewPagination = (options: {
  readonly view: PictureDiaryView
  readonly compact: boolean
  readonly entries: ReadonlyArray<PictureDiaryEntry>
}) =>
  getBookPagination({
    closed: options.view.kind === 'back-cover',
    compact: options.compact,
    ending: options.view.kind === 'ending' || options.view.kind === 'front-cover',
    entries: options.entries,
    selectedId: options.view.kind === 'entry' ? options.view.id : undefined,
  })

const mergeLoadedEntries = (
  loaded: ReadonlyArray<PictureDiaryEntry>,
  current: ReadonlyArray<PictureDiaryEntry>,
) => {
  const currentIds = new Set(current.map((entry) => entry.id))
  return sortPictureDiaryEntries([
    ...loaded.filter((entry) => !currentIds.has(entry.id)),
    ...current,
  ])
}

interface PictureDiaryStatusProps {
  readonly message: string | null
}

const PictureDiaryStatus = (props: PictureDiaryStatusProps) => (
  <Show when={props.message}>
    {(message) => (
      <p aria-live="polite" class="m-0 text-sm text-muted-foreground" role="status">
        {message()}
      </p>
    )}
  </Show>
)

const getWeatherSnapshot = (state?: WeatherState): PictureDiaryWeather | undefined => {
  if (state?.status !== 'ready') {
    return undefined
  }

  return {
    condition: state.feed.current.condition,
    temperatureCelsius: state.feed.current.temperatureCelsius,
  }
}

export const PictureDiary = (props: PictureDiaryProps) => {
  const environment = untrack(() => props.environment ?? createBrowserDiaryEnvironment())
  const repository = untrack(() => props.repository ?? createPictureDiaryRepository())
  const [entries, setEntries] = createSignal<ReadonlyArray<PictureDiaryEntry>>([])
  const editing = useEntryEditing({
    environment,
    onSaved: (entry) => setEntries((current) => mergeLoadedEntries(current, [entry])),
    repository,
  })
  const [view, setView] = createSignal<PictureDiaryView>({kind: 'writing'})
  const [date, setDate] = createSignal(getDateValue(environment.now()))
  const [strokes, setStrokes] = createSignal<ReadonlyArray<PictureDiaryStroke>>([])
  const [image, setImage] = createSignal<PictureDiaryImage>()
  const [text, setText] = createSignal('')
  const [compact, setCompact] = createSignal(false)
  const [message, setMessage] = createSignal<string | null>(null)
  const [saving, setSaving] = createSignal(false)
  const canSave = createMemo(
    () =>
      !saving() &&
      date().length > 0 &&
      (text().trim().length > 0 || strokes().length > 0 || image() !== undefined),
  )
  const backCoverClosed = createMemo(() => view().kind === 'back-cover')
  const pagination = createMemo(() =>
    getViewPagination({compact: compact(), entries: entries(), view: view()}),
  )
  const canCloseBackCover = createMemo(() => !backCoverClosed() && pagination().older === null)

  const handleOpenSpread = (spread: BookSpread | null) => {
    if (spread === null) {
      return
    }
    setView(getSpreadView(spread))
    setMessage(null)
  }

  const handleDateChange = (nextDate: string) => {
    setDate(nextDate)
    setMessage(null)
  }

  const handleCloseBackCover = () => {
    setView({kind: 'back-cover'})
    setMessage(null)
  }

  const handleOpenBackCover = () => {
    const oldestEntry = entries().at(-1)

    setView(oldestEntry === undefined ? {kind: 'writing'} : {id: oldestEntry.id, kind: 'entry'})
    setMessage(null)
  }

  const handleSave = async () => {
    if (!canSave()) {
      return
    }

    const snapshot = {date: date(), image: image(), strokes: strokes(), text: text(), view: view()}
    setSaving(true)
    try {
      const now = environment.now()
      const entry = createPictureDiaryEntry({
        createdAt: now.toISOString(),
        date: snapshot.date,
        id: environment.createId(),
        image: snapshot.image,
        now,
        strokes: snapshot.strokes,
        text: snapshot.text,
        weather: getWeatherSnapshot(props.weatherState),
      })
      await repository.save(entry)
      setEntries((currentEntries) => mergeLoadedEntries(currentEntries, [entry]))
      if (
        image() === snapshot.image &&
        date() === snapshot.date &&
        strokes() === snapshot.strokes &&
        text() === snapshot.text
      ) {
        setDate(getDateValue(environment.now()))
        setStrokes([])
        setImage(undefined)
        setText('')
        if (view() === snapshot.view) {
          setView({id: entry.id, kind: 'entry'})
        }
      }
      setMessage(m.picture_diary_saved_message())
    } catch (error: unknown) {
      console.error('Failed to save a picture diary entry.', error)
      setMessage(m.picture_diary_save_failed())
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (entryId: string) => {
    try {
      await repository.delete(entryId)
      setEntries((currentEntries) => currentEntries.filter((entry) => entry.id !== entryId))
      const currentView = view()
      if (currentView.kind === 'entry' && currentView.id === entryId) {
        setView({kind: 'writing'})
      }
    } catch (error: unknown) {
      console.error('Failed to delete a picture diary entry.', error)
      setMessage(m.picture_diary_delete_failed())
    }
  }

  onMount(() => {
    onCleanup(environment.observeCompact(setCompact))
    repository
      .list()
      .then((loaded) => setEntries((current) => mergeLoadedEntries(loaded, current)))
      .catch((error: unknown) => {
        console.error('Failed to load picture diary entries.', error)
        setMessage(m.picture_diary_load_failed())
      })
  })

  return (
    <section class="grid gap-5 settings-compact:gap-4">
      <PictureDiaryEditor
        turnEnvironment={props.turnEnvironment}
        frontCoverClosed={view().kind === 'front-cover'}
        onFrontCoverChange={(closed) => setView({kind: closed ? 'front-cover' : 'ending'})}
        backCoverClosed={backCoverClosed()}
        canCloseBackCover={canCloseBackCover()}
        canGoNewer={pagination().newer !== null}
        canGoOlder={pagination().older !== null}
        canSave={canSave()}
        spread={pagination().current}
        date={date()}
        newerSpread={pagination().newer}
        olderSpread={pagination().older}
        onCloseBackCover={handleCloseBackCover}
        onDateChange={handleDateChange}
        onDeleteEntry={handleDelete}
        onEditEntry={editing.open}
        editing={editing.editor()}
        onGoNewer={() => handleOpenSpread(pagination().newer)}
        onGoOlder={() => handleOpenSpread(pagination().older)}
        onOpenBackCover={handleOpenBackCover}
        onSave={handleSave}
        image={image()}
        onImageChange={setImage}
        onStrokesChange={setStrokes}
        onTextChange={setText}
        strokes={strokes()}
        text={text()}
      />

      <PictureDiaryStatus message={message()} />
    </section>
  )
}
