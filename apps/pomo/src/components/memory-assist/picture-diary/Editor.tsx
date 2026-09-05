import {cx} from 'class-variance-authority'
import {type JSX, Match, Show, Switch} from 'solid-js'

import * as m from '@paraglide/message'
import {
  MAXIMUM_PICTURE_DIARY_TEXT_LENGTH,
  type PictureDiaryEntry,
  type PictureDiaryImage,
  type PictureDiaryStroke,
} from '../../../features/picture-diary'
import {getLocalizedWeatherLabel} from '../../../features/localization'
import {getWeatherPresentation} from '../../../features/weather'
import {HConfirmButton} from '../../HConfirmButton'
import {PButton} from '../../PButton'
import {PictureDiaryCanvas} from './Canvas'
import {PictureDiaryDrawing} from './Drawing'
import {PictureDiaryEdgeTurns} from './EdgeTurns'
import type {BookPage, BookSpread} from './pagination'
import {getTurnProperties} from './turn-properties'
import type {PageTurnEnvironment} from './turn-environment'
import {
  type PictureDiaryTurnDirection,
  type PictureDiaryTurnIntent,
  type PictureDiaryTurnView,
  usePictureDiaryPageTurn,
} from './use-page-turn'
import type {EntryEditingController} from './use-entry-editing'
import './editor.css'

export interface PictureDiaryEditorProps {
  readonly editing?: ReturnType<EntryEditingController['editor']>
  readonly disabled?: boolean
  readonly editingMessage?: string
  readonly onCancelEdit?: () => void
  readonly image?: PictureDiaryImage
  readonly onImageChange?: (image: PictureDiaryImage | undefined) => void
  readonly turnEnvironment?: PageTurnEnvironment
  readonly frontCoverClosed?: boolean
  readonly onFrontCoverChange?: (closed: boolean) => void
  readonly backCoverClosed?: boolean
  readonly canCloseBackCover?: boolean
  readonly canGoNewer?: boolean
  readonly canGoOlder?: boolean
  readonly spread: BookSpread
  readonly olderSpread?: BookSpread | null
  readonly newerSpread?: BookSpread | null
  readonly canSave: boolean
  readonly date: string
  readonly onCloseBackCover?: () => void
  readonly onDateChange: (date: string) => void
  readonly onEditEntry?: (entry: PictureDiaryEntry) => void
  readonly onDeleteEntry?: (id: string) => void
  readonly onGoNewer?: () => void
  readonly onGoOlder?: () => void
  readonly onOpenBackCover?: () => void
  readonly onSave: () => void
  readonly onStrokesChange: (strokes: ReadonlyArray<PictureDiaryStroke>) => void
  readonly onTextChange: (text: string) => void
  readonly strokes: ReadonlyArray<PictureDiaryStroke>
  readonly text: string
}

const formatPageDate = (date: string) => `${date.replaceAll('-', '. ')}.`
const formatTemperature = (temperature: number | null) =>
  temperature === null ? null : `${Math.round(temperature)}°`
type PageSide = 'current' | 'previous'

interface PictureDiaryReadPageProps {
  readonly entry?: PictureDiaryEntry | null
  readonly onEdit?: (entry: PictureDiaryEntry) => void
  readonly onDelete?: (id: string) => void
  readonly side: PageSide
}

interface PictureDiaryBackCoverProps {
  readonly closed?: 'back' | 'front'
  readonly side: PageSide
  readonly surface: 'inside' | 'outside'
}

const PictureDiaryBackCover = (props: PictureDiaryBackCoverProps) => (
  <section
    aria-hidden="true"
    class={cx(
      'picture-diary-book__page',
      `picture-diary-book__page--${props.side}`,
      'picture-diary-book__back-cover',
      `picture-diary-book__back-cover--${props.surface}`,
    )}
    data-picture-diary-cover={props.closed}
  >
    <span class="i-tabler-book-2 picture-diary-book__cover-mark" />
  </section>
)

const PictureDiaryReadPage = (props: PictureDiaryReadPageProps) => (
  <section
    class={`picture-diary-book__page picture-diary-book__page--${props.side}`}
    data-picture-diary-mode="read"
    data-picture-diary-page={props.side}
  >
    <Show when={props.entry}>
      {(entry) => (
        <>
          <div class="picture-diary-book__heading picture-diary-book__heading--read">
            <div class="picture-diary-book__heading-primary">
              <time class="picture-diary-book__date" datetime={entry().date}>
                {formatPageDate(entry().date)}
              </time>
              <Show when={props.onEdit}>
                <button
                  aria-label={m.picture_diary_edit_entry()}
                  class="diary-page-action"
                  type="button"
                  onClick={() => props.onEdit?.(entry())}
                >
                  <span aria-hidden="true" class="i-tabler-pencil w-4 h-4" />
                </button>
              </Show>
              <Show when={props.onDelete}>
                {(onDelete) => (
                  <HConfirmButton
                    accessibleLabel={m.picture_diary_delete_entry({
                      date: formatPageDate(entry().date),
                    })}
                    class="diary-page-action diary-page-delete"
                    confirmationAccessibleLabel={m.picture_diary_delete_confirm_label({
                      date: formatPageDate(entry().date),
                    })}
                    confirmationChildren={
                      <span class="picture-diary-book__delete-confirmation">
                        {m.picture_diary_delete_confirm()}
                      </span>
                    }
                    onConfirm={() => onDelete()(entry().id)}
                  >
                    <span aria-hidden="true" class="i-tabler-x w-4 h-4" />
                  </HConfirmButton>
                )}
              </Show>
            </div>
            <Show when={entry().weather}>
              {(weather) => {
                const presentation = getWeatherPresentation(weather().condition)
                const temperature = formatTemperature(weather().temperatureCelsius)

                return (
                  <span class="picture-diary-book__weather">
                    <span
                      aria-hidden="true"
                      class={`${presentation.icon} picture-diary-book__weather-icon`}
                    />
                    <span>{getLocalizedWeatherLabel(weather().condition)}</span>
                    <Show when={temperature}>{(label) => <span> · {label()}</span>}</Show>
                  </span>
                )
              }}
            </Show>
          </div>
          <PictureDiaryCanvas
            accessibleLabel={m.picture_diary_saved_drawing()}
            image={entry().image}
            readOnly={true}
            strokes={entry().strokes}
          />
          <div class="picture-diary-book__entry-writing">
            <p>{entry().text}</p>
          </div>
        </>
      )}
    </Show>
  </section>
)

interface PictureDiaryWritingPageProps {
  readonly editor: PictureDiaryEditorProps
  readonly preview?: boolean
  readonly side?: PageSide
}

const PictureDiaryWritingPage = (props: PictureDiaryWritingPageProps) => (
  <section
    class={`picture-diary-book__page picture-diary-book__page--${props.side ?? 'current'}`}
    data-picture-diary-mode="write"
    data-picture-diary-page={props.side ?? 'current'}
  >
    <div class="picture-diary-book__heading">
      <label class="picture-diary-book__date-field">
        <span class="sr-only">{m.picture_diary_date()}</span>
        <input
          aria-label={m.picture_diary_date()}
          disabled={props.preview || props.editor.disabled}
          onInput={(event) => props.editor.onDateChange(event.currentTarget.value)}
          type="date"
          value={props.editor.date}
        />
      </label>
    </div>
    <PictureDiaryDrawing
      disabled={props.preview || props.editor.disabled}
      image={props.editor.image}
      onImageChange={props.editor.onImageChange}
      idea={props.editor.text}
      onChange={props.editor.onStrokesChange}
      strokes={props.editor.strokes}
    />
    <textarea
      aria-label={m.picture_diary_writing()}
      class="picture-diary-book__writing"
      disabled={props.preview || props.editor.disabled}
      maxlength={MAXIMUM_PICTURE_DIARY_TEXT_LENGTH}
      onInput={(event) => props.editor.onTextChange(event.currentTarget.value)}
      placeholder={m.picture_diary_placeholder()}
      value={props.editor.text}
    />
    <footer class="picture-diary-book__footer picture-diary-book__footer--current flex-wrap gap-3">
      <PButton
        accessibleLabel={m.picture_diary_save()}
        disabled={props.preview || !props.editor.canSave}
        icon="i-tabler-device-floppy"
        onPress={props.editor.onSave}
        size="small"
      >
        {m.picture_diary_save()}
      </PButton>
      <Show when={props.editor.onCancelEdit}>
        <PButton
          class="diary-edit-cancel"
          size="small"
          tone="secondary"
          disabled={props.preview || props.editor.disabled}
          onPress={props.editor.onCancelEdit}
        >
          {m.picture_diary_cancel_edit()}
        </PButton>
      </Show>
    </footer>
    <Show when={props.editor.editingMessage}>
      <p role="alert" class="m-0 text-sm">
        {props.editor.editingMessage}
      </p>
    </Show>
  </section>
)

interface PictureDiaryPageProps {
  readonly editor: PictureDiaryEditorProps
  readonly page: BookPage
  readonly side: PageSide
  readonly preview?: boolean
}
const PictureDiaryPage = (props: PictureDiaryPageProps) => (
  <Switch fallback={<PictureDiaryReadPage side={props.side} />}>
    <Match when={props.page.kind === 'cover'}>
      <PictureDiaryBackCover side={props.side} surface="inside" />
    </Match>
    <Match when={props.page.kind === 'writing'}>
      <PictureDiaryWritingPage editor={props.editor} side={props.side} preview={props.preview} />
    </Match>
    <Match when={props.page.kind === 'entry' ? props.page.entry : null}>
      {(entry) => (
        <Show
          when={props.editor.editing?.id === entry().id ? props.editor.editing : undefined}
          fallback={
            <PictureDiaryReadPage
              entry={entry()}
              onEdit={props.preview ? undefined : props.editor.onEditEntry}
              onDelete={props.preview ? undefined : props.editor.onDeleteEntry}
              side={props.side}
            />
          }
        >
          {(draft) => (
            <PictureDiaryWritingPage
              editor={{...props.editor, ...draft()}}
              side={props.side}
              preview={props.preview}
            />
          )}
        </Show>
      )}
    </Match>
  </Switch>
)
interface PictureDiarySpreadProps {
  readonly editor: PictureDiaryEditorProps
  readonly turning: boolean
  readonly closed: boolean
  readonly spread: BookSpread
}
const PictureDiarySpread = (props: PictureDiarySpreadProps) => (
  <div
    inert={props.turning}
    class={cx('picture-diary-book__spread', props.closed && 'picture-diary-book__spread--closed')}
  >
    <Show
      when={!props.closed}
      fallback={
        <PictureDiaryBackCover
          closed={props.editor.frontCoverClosed ? 'front' : 'back'}
          side="current"
          surface="outside"
        />
      }
    >
      <PictureDiaryPage editor={props.editor} page={props.spread.left} side="previous" />
      <PictureDiaryPage editor={props.editor} page={props.spread.right} side="current" />
    </Show>
  </div>
)

interface PictureDiaryPagerProps {
  readonly frontCoverClosed?: boolean
  readonly backCoverClosed?: boolean
  readonly canGoNewer?: boolean
  readonly canGoOlder?: boolean
  readonly disabled?: boolean
  readonly onTurn: (direction: PictureDiaryTurnDirection) => void
}

const PictureDiaryPager = (props: PictureDiaryPagerProps) => (
  <div class="picture-diary-book__pager" hidden={props.disabled}>
    <Show when={!props.backCoverClosed}>
      <button
        aria-label={m.picture_diary_previous_entry()}
        class="picture-diary-book__turn picture-diary-book__turn--older"
        disabled={!props.canGoOlder || props.disabled}
        onClick={() => props.onTurn('older')}
        type="button"
      >
        <span aria-hidden="true" class="i-tabler-chevron-left size-4" />
      </button>
    </Show>
    <Show when={!props.frontCoverClosed}>
      <button
        aria-label={m.picture_diary_next_entry()}
        class="picture-diary-book__turn picture-diary-book__turn--newer"
        disabled={!props.canGoNewer || props.disabled}
        onClick={() => props.onTurn('newer')}
        type="button"
      >
        <span aria-hidden="true" class="i-tabler-chevron-right size-4" />
      </button>
    </Show>
  </div>
)

interface PictureDiaryTurnSheetProps {
  readonly editor: PictureDiaryEditorProps
  readonly front: BookPage
  readonly back: BookPage
  readonly turn: PictureDiaryTurnView
}

const PictureDiaryTurnSheet = (props: PictureDiaryTurnSheetProps) => (
  <div
    aria-hidden="true"
    inert
    class={cx(
      'picture-diary-book__turn-sheet',
      `picture-diary-book__turn-sheet--${props.turn.direction}`,
      props.turn.kind === 'cover' && 'picture-diary-book__turn-sheet--cover',
    )}
    data-picture-diary-cover-turn={props.turn.kind === 'cover' ? '' : undefined}
    data-picture-diary-turn-sheet=""
    data-turn-direction={props.turn.direction}
    data-turn-origin="bottom"
    data-turn-phase={props.turn.phase}
    style={getTurnProperties(props.turn)}
  >
    <Show
      fallback={
        <>
          <div
            class="picture-diary-book__turn-rest picture-diary-book__turn-face--front"
            data-picture-diary-turn-face="front"
          >
            <PictureDiaryPage editor={props.editor} page={props.front} side="current" preview />
          </div>
          <div
            class="picture-diary-book__turn-flap picture-diary-book__turn-face--back"
            data-picture-diary-turn-face="back"
          >
            <div class="picture-diary-book__turn-flap-content">
              <PictureDiaryPage editor={props.editor} page={props.back} side="current" preview />
            </div>
          </div>
        </>
      }
      when={props.turn.kind === 'cover'}
    >
      <div class="picture-diary-book__cover-turn-sheet">
        <div class="picture-diary-book__cover-turn-face picture-diary-book__cover-turn-face--front">
          <PictureDiaryBackCover
            side={props.turn.direction === 'older' ? 'previous' : 'current'}
            surface={
              props.editor.backCoverClosed || props.editor.frontCoverClosed ? 'outside' : 'inside'
            }
          />
        </div>
        <div class="picture-diary-book__cover-turn-face picture-diary-book__cover-turn-face--back">
          <PictureDiaryBackCover
            side={props.turn.direction === 'older' ? 'current' : 'previous'}
            surface={
              props.editor.backCoverClosed || props.editor.frontCoverClosed ? 'inside' : 'outside'
            }
          />
        </div>
      </div>
    </Show>
  </div>
)

const getBaseSpread = (editor: PictureDiaryEditorProps, turn: PictureDiaryTurnView): BookSpread => {
  const target =
    (turn.direction === 'older' ? editor.olderSpread : editor.newerSpread) ?? editor.spread
  if (turn.kind === 'cover') {
    return turn.direction === 'older' ? editor.spread : target
  }
  if (turn.compact) {
    return target
  }
  return turn.direction === 'older'
    ? {left: target.left, right: editor.spread.right}
    : {left: editor.spread.left, right: target.right}
}

export const PictureDiaryEditor = (props: PictureDiaryEditorProps) => {
  let turnSurface: HTMLDivElement | undefined

  const resolveTurnIntent = (
    direction: PictureDiaryTurnDirection,
  ): PictureDiaryTurnIntent | null => {
    if (direction === 'older') {
      if (props.frontCoverClosed) {
        return {direction, kind: 'cover'}
      }
      if (props.backCoverClosed) {
        return null
      }

      if (props.olderSpread !== null && props.olderSpread !== undefined) {
        return {direction, kind: 'entry'}
      }

      return props.canCloseBackCover ? {direction, kind: 'cover'} : null
    }

    if (props.frontCoverClosed) {
      return null
    }
    if (props.backCoverClosed || props.spread.right.kind === 'cover') {
      return {direction, kind: 'cover'}
    }

    return props.canGoNewer ? {direction, kind: 'entry'} : null
  }

  const handleCompletedTurn = (turn: PictureDiaryTurnIntent) => {
    if (turn.kind === 'cover') {
      if (props.frontCoverClosed || (turn.direction === 'newer' && !props.backCoverClosed)) {
        props.onFrontCoverChange?.(!props.frontCoverClosed)
        return
      }
      if (turn.direction === 'older') {
        props.onCloseBackCover?.()
      } else {
        props.onOpenBackCover?.()
      }
      return
    }

    if (turn.direction === 'older') {
      props.onGoOlder?.()
    } else {
      props.onGoNewer?.()
    }
  }

  const pageTurn = usePictureDiaryPageTurn({
    disabled: () => false,
    get environment() {
      return props.turnEnvironment
    },
    onComplete: handleCompletedTurn,
    resolveIntent: resolveTurnIntent,
    surface: () => turnSurface,
  })

  const handleBookKeyDown: JSX.EventHandler<HTMLDivElement, KeyboardEvent> = (event) => {
    if (event.target !== event.currentTarget) {
      return
    }

    if (event.key === 'ArrowLeft' && canTurnOlder()) {
      event.preventDefault()
      pageTurn.startTurn('older')
    }

    if (event.key === 'ArrowRight' && canTurnNewer()) {
      event.preventDefault()
      pageTurn.startTurn('newer')
    }
  }

  const canTurnOlder = () =>
    props.frontCoverClosed ||
    (!props.backCoverClosed && (props.canGoOlder || props.canCloseBackCover))
  const canTurnNewer = () =>
    !props.frontCoverClosed && (props.canGoNewer || props.spread.right.kind === 'cover')
  const turningFront = (turn: PictureDiaryTurnView) =>
    turn.direction === 'older' && !turn.compact ? props.spread.left : props.spread.right
  const turningBack = (turn: PictureDiaryTurnView) =>
    turn.direction === 'older'
      ? (props.olderSpread?.right ?? ({kind: 'blank'} as const))
      : (props.newerSpread?.[turn.compact ? 'right' : 'left'] ?? ({kind: 'blank'} as const))

  return (
    <div
      class="picture-diary-book__frame"
      data-picture-diary-cover-closed={
        props.frontCoverClosed ? 'front' : props.backCoverClosed ? 'back' : undefined
      }
    >
      <div
        aria-label={m.picture_diary_tab()}
        aria-roledescription="book"
        class="picture-diary-book"
        data-picture-diary-book=""
        data-turn-direction={pageTurn.view()?.direction}
        data-turn-kind={pageTurn.view()?.kind}
        data-cover-end={
          props.frontCoverClosed ||
          (!props.backCoverClosed && pageTurn.view()?.direction === 'newer')
            ? 'front'
            : 'back'
        }
        data-turn-phase={pageTurn.view()?.phase}
        onKeyDown={handleBookKeyDown}
        role="group"
        tabIndex={0}
      >
        <PictureDiarySpread
          editor={props}
          turning={pageTurn.view() !== null}
          closed={
            (props.backCoverClosed === true || props.frontCoverClosed === true) &&
            pageTurn.view() === null
          }
          spread={pageTurn.view() ? getBaseSpread(props, pageTurn.view()!) : props.spread}
        />
        <Show when={pageTurn.view()}>
          {(turn) => (
            <PictureDiaryTurnSheet
              editor={props}
              front={turningFront(turn())}
              back={turningBack(turn())}
              turn={turn()}
            />
          )}
        </Show>
        <PictureDiaryEdgeTurns
          canGoNewer={canTurnNewer()}
          canGoOlder={canTurnOlder()}
          draggingDirection={
            pageTurn.view()?.phase === 'move' ? pageTurn.view()?.direction : undefined
          }
          onPointerDown={pageTurn.handlePointerDown}
          onSurface={(element) => {
            turnSurface = element
          }}
        />
      </div>

      <PictureDiaryPager
        frontCoverClosed={props.frontCoverClosed}
        backCoverClosed={props.backCoverClosed}
        canGoNewer={canTurnNewer()}
        canGoOlder={canTurnOlder()}
        disabled={pageTurn.view() !== null}
        onTurn={pageTurn.startTurn}
      />
    </div>
  )
}
