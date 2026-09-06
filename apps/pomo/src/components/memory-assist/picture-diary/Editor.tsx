import {type JSX, Show} from 'solid-js'
import * as m from '@paraglide/message'
import {PictureDiaryEdgeTurns} from './EdgeTurns'
import type {BookSpread} from './pagination'
import {
  type PictureDiaryTurnDirection,
  type PictureDiaryTurnIntent,
  type PictureDiaryTurnView,
  usePictureDiaryPageTurn,
} from './use-page-turn'
import './editor.css'
import {type PictureDiaryEditorProps} from './editor-props'
import {PictureDiarySpread} from './Spread'
import {PictureDiaryTurnSheet} from './TurnSheet'
import {PictureDiaryPager} from './Pager'

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

export type {PictureDiaryEditorProps} from './editor-props'
