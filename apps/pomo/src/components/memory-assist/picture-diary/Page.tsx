import {Match, Show, Switch} from 'solid-js'
import type {BookPage} from './pagination'
import {type PageSide, type PictureDiaryEditorProps} from './editor-props'
import {PictureDiaryReadPage} from './ReadPage'
import {PictureDiaryBackCover} from './BackCover'
import {PictureDiaryWritingPage} from './WritingPage'

interface PictureDiaryPageProps {
  readonly editor: PictureDiaryEditorProps
  readonly page: BookPage
  readonly side: PageSide
  readonly preview?: boolean
}

export const PictureDiaryPage = (props: PictureDiaryPageProps) => (
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
