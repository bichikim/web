import {createSignal, Show} from 'solid-js'
import * as m from '@paraglide/message'
import type {PictureDiaryStroke} from '../../../features/picture-diary'
import {PButton} from '../../PButton'
import {PModal} from '../../PModal'
import {PictureDiaryCanvas} from './Canvas'
import './drawing.css'

export interface PictureDiaryDrawingProps {
  readonly strokes: ReadonlyArray<PictureDiaryStroke>
  readonly onChange?: (strokes: ReadonlyArray<PictureDiaryStroke>) => void
  readonly disabled?: boolean
}

export const PictureDiaryDrawing = (props: PictureDiaryDrawingProps) => {
  const [isOpen, setIsOpen] = createSignal(false)
  const [limitReached, setLimitReached] = createSignal(false)
  const [trigger, setTrigger] = createSignal<HTMLButtonElement>()
  return (
    <>
      <button
        aria-label={m.picture_diary_edit_drawing()}
        aria-haspopup="dialog"
        class="picture-diary-drawing__trigger"
        disabled={props.disabled}
        onClick={() => setIsOpen(true)}
        ref={setTrigger}
        type="button"
      >
        <PictureDiaryCanvas readOnly strokes={props.strokes} />
      </button>
      <PModal
        headerMode="hidden"
        isOpen={isOpen()}
        onOpenChange={setIsOpen}
        onCloseAutoFocus={() => trigger()?.focus()}
        size="wide"
        title={m.picture_diary_edit_drawing()}
        footer={
          <div class="picture-diary-drawing__actions">
            <PButton
              children={null}
              accessibleLabel={m.picture_diary_undo()}
              icon="i-tabler-arrow-back-up"
              size="small"
              tone="secondary"
              disabled={props.strokes.length === 0}
              onPress={() => {
                props.onChange?.(props.strokes.slice(0, -1))
                setLimitReached(false)
              }}
            />
            <PButton
              children={null}
              accessibleLabel={m.picture_diary_clear()}
              icon="i-tabler-eraser"
              size="small"
              tone="secondary"
              disabled={props.strokes.length === 0}
              onPress={() => {
                props.onChange?.([])
                setLimitReached(false)
              }}
            />
            <PButton
              class="picture-diary-drawing__done"
              size="small"
              onPress={() => setIsOpen(false)}
            >
              {m.picture_diary_drawing_done()}
            </PButton>
          </div>
        }
      >
        <div class="picture-diary-drawing__surface">
          <PictureDiaryCanvas
            strokes={props.strokes}
            onChange={props.onChange}
            onLimit={() => setLimitReached(true)}
          />
        </div>
        <Show when={limitReached()}>
          <p role="status">{m.picture_diary_drawing_limit()}</p>
        </Show>
      </PModal>
    </>
  )
}
