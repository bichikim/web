import {cx} from 'class-variance-authority'
import {Show} from 'solid-js'
import type {BookPage} from './pagination'
import {getTurnProperties} from './turn-properties'
import {type PictureDiaryTurnView} from './use-page-turn'
import {type PictureDiaryEditorProps} from './editor-props'
import {PictureDiaryPage} from './Page'
import {PictureDiaryBackCover} from './BackCover'

interface PictureDiaryTurnSheetProps {
  readonly editor: PictureDiaryEditorProps
  readonly front: BookPage
  readonly back: BookPage
  readonly turn: PictureDiaryTurnView
}

export const PictureDiaryTurnSheet = (props: PictureDiaryTurnSheetProps) => (
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
