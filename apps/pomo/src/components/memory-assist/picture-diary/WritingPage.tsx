import {PInput} from 'src/components/PInput'
import {PTextarea} from 'src/components/PTextarea'
import {Show} from 'solid-js'
import * as m from '@paraglide/message'
import {MAXIMUM_PICTURE_DIARY_TEXT_LENGTH} from '../../../features/picture-diary'
import {PButton} from '../../PButton'
import {PictureDiaryDrawing} from './Drawing'
import {type PageSide, type PictureDiaryEditorProps} from './editor-props'

const CANCEL_CLASSES =
  '[&&]:[color:rgb(var(--picture-diary-ink))] ' +
  '[&&]:[background:rgb(var(--picture-diary-rule)/6%)] ' +
  '[&&]:[border-color:rgb(var(--picture-diary-rule)/32%)] ' +
  '[&&]:hover:[background:rgb(var(--picture-diary-rule)/14%)] ' +
  '[&&]:hover:[border-color:rgb(var(--picture-diary-rule)/52%)]'

interface PictureDiaryWritingPageProps {
  readonly editor: PictureDiaryEditorProps
  readonly preview?: boolean
  readonly side?: PageSide
}

export const PictureDiaryWritingPage = (props: PictureDiaryWritingPageProps) => (
  <section
    class={`picture-diary-book__page picture-diary-book__page--${props.side ?? 'current'}`}
    data-picture-diary-mode="write"
    data-picture-diary-page={props.side ?? 'current'}
  >
    <div class="picture-diary-book__heading">
      <label class="picture-diary-book__date-field">
        <span class="sr-only">{m.picture_diary_date()}</span>
        <PInput
          unstyled
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
    <PTextarea
      unstyled
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
        raised
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
          bordered
          transparent
          class={CANCEL_CLASSES}
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
