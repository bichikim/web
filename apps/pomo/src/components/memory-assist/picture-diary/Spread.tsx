import {cx} from 'class-variance-authority'
import {Show} from 'solid-js'
import type {BookSpread} from './pagination'
import {type PictureDiaryEditorProps} from './editor-props'
import {PictureDiaryBackCover} from './BackCover'
import {PictureDiaryPage} from './Page'

interface PictureDiarySpreadProps {
  readonly editor: PictureDiaryEditorProps
  readonly turning: boolean
  readonly closed: boolean
  readonly spread: BookSpread
}

export const PictureDiarySpread = (props: PictureDiarySpreadProps) => (
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
