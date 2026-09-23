import {formatLocalDate} from 'src/utils/format-local-date'
import {createMemo, createSignal, onCleanup, onMount, untrack} from 'solid-js'
import {isNonBlankString} from 'src/utils/is-non-blank-string'
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
import {PictureDiaryStatus} from './picture-diary/Status'

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

const getWeatherSnapshot = (state?: WeatherState): PictureDiaryWeather | undefined => {
  if (state?.status !== 'ready') {
    return undefined
  }

  return {
    condition: state.feed.current.condition,
    temperatureCelsius: state.feed.current.temperatureCelsius,
  }
}

interface PictureDiarySaveOptions {
  readonly dateEdited: boolean
  readonly environment: PictureDiaryEnvironment
  readonly isDisposed: () => boolean
  readonly repository: PictureDiaryRepository
  readonly snapshot: {
    readonly date: string
    readonly image: PictureDiaryImage | undefined
    readonly strokes: ReadonlyArray<PictureDiaryStroke>
    readonly text: string
  }
  readonly weatherState?: WeatherState
}

const discardPictureDiaryEntry = async (
  repository: PictureDiaryRepository,
  entryId: string,
): Promise<void> => {
  try {
    await repository.delete(entryId)
  } catch (error: unknown) {
    console.error('Failed to discard a picture diary entry after disposal.', error)
  }
}

const savePictureDiaryEntry = async (
  options: PictureDiarySaveOptions,
): Promise<PictureDiaryEntry | null> => {
  const now = options.environment.now()
  const entry = createPictureDiaryEntry({
    createdAt: now.toISOString(),
    date: options.dateEdited ? options.snapshot.date : formatLocalDate(now),
    id: options.environment.createId(),
    image: options.snapshot.image,
    now,
    strokes: options.snapshot.strokes,
    text: options.snapshot.text,
    weather: getWeatherSnapshot(options.weatherState),
  })
  await options.repository.save(entry)

  if (!options.isDisposed()) {
    return entry
  }

  await discardPictureDiaryEntry(options.repository, entry.id)
  return null
}

// oxlint-disable-next-line eslint/max-lines-per-function -- The diary editor and its persistence lifecycle share one disposable owner.
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
  const [date, setDate] = createSignal(formatLocalDate(environment.now()))
  const [dateEdited, setDateEdited] = createSignal(false)
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
      (isNonBlankString(text()) || strokes().length > 0 || image() !== undefined),
  )
  const backCoverClosed = createMemo(() => view().kind === 'back-cover')
  const pagination = createMemo(() =>
    getViewPagination({compact: compact(), entries: entries(), view: view()}),
  )
  let isDisposed = false

  onCleanup(() => {
    isDisposed = true
  })

  const handleOpenSpread = (spread: BookSpread | null) => {
    if (spread === null) {
      return
    }
    setView(getSpreadView(spread))
    setMessage(null)
  }

  const handleDateChange = (nextDate: string) => {
    setDate(nextDate)
    setDateEdited(true)
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
      const entry = await savePictureDiaryEntry({
        dateEdited: dateEdited(),
        environment,
        isDisposed: () => isDisposed,
        repository,
        snapshot,
        weatherState: props.weatherState,
      })
      if (entry === null) {
        return
      }
      if (isDisposed) {
        await discardPictureDiaryEntry(repository, entry.id)
        return
      }
      setEntries((currentEntries) => mergeLoadedEntries(currentEntries, [entry]))
      if (
        image() === snapshot.image &&
        date() === snapshot.date &&
        strokes() === snapshot.strokes &&
        text() === snapshot.text
      ) {
        setDate(formatLocalDate(environment.now()))
        setDateEdited(false)
        setStrokes([])
        setImage(undefined)
        setText('')
        if (view() === snapshot.view) {
          setView({id: entry.id, kind: 'entry'})
        }
      }
      setMessage(m.picture_diary_saved_message())
    } catch (error: unknown) {
      if (!isDisposed) {
        console.error('Failed to save a picture diary entry.', error)
        setMessage(m.picture_diary_save_failed())
      }
    } finally {
      if (!isDisposed) {
        setSaving(false)
      }
    }
  }

  const handleDelete = async (entryId: string) => {
    try {
      await repository.delete(entryId)
      if (isDisposed) {
        return
      }
      setEntries((currentEntries) => currentEntries.filter((entry) => entry.id !== entryId))
      const currentView = view()
      if (currentView.kind === 'entry' && currentView.id === entryId) {
        setView({kind: 'writing'})
      }
    } catch (error: unknown) {
      if (!isDisposed) {
        console.error('Failed to delete a picture diary entry.', error)
        setMessage(m.picture_diary_delete_failed())
      }
    }
  }

  onMount(() => {
    onCleanup(environment.observeCompact(setCompact))
    repository
      .list()
      .then((loaded) => {
        if (!isDisposed) {
          setEntries((current) => mergeLoadedEntries(loaded, current))
        }
      })
      .catch((error: unknown) => {
        if (!isDisposed) {
          console.error('Failed to load picture diary entries.', error)
          setMessage(m.picture_diary_load_failed())
        }
      })
  })

  return (
    <section class="grid gap-5 settings-compact:gap-4">
      <PictureDiaryEditor
        turnEnvironment={props.turnEnvironment}
        frontCoverClosed={view().kind === 'front-cover'}
        onFrontCoverChange={(closed) => setView({kind: closed ? 'front-cover' : 'ending'})}
        backCoverClosed={backCoverClosed()}
        canCloseBackCover={!backCoverClosed() && pagination().older === null}
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
