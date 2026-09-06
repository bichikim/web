import {type JSX, Show} from 'solid-js'
import * as m from '@paraglide/message'
import {PButton} from '../../PButton'

interface DrawingActionsProps {
  readonly children?: JSX.Element
  readonly onDone: () => void
  readonly doneDisabled: boolean
  readonly drawing: boolean
  readonly canUndo: boolean
  readonly canRedo: boolean
  readonly canClear: boolean
  readonly onUndo: () => void
  readonly onRedo: () => void
  readonly onClear: () => void
}

export const DrawingActions = (props: DrawingActionsProps) => (
  <div class="flex flex-wrap items-center gap-2">
    <Show when={props.drawing}>
      <div class="flex shrink-0 gap-2">
        <PButton
          bordered
          transparent
          size="small"
          tone="secondary"
          accessibleLabel={m.picture_diary_undo()}
          tooltip={m.picture_diary_undo()}
          icon="i-tabler-arrow-back-up"
          disabled={!props.canUndo}
          onPress={props.onUndo}
        />
        <PButton
          bordered
          transparent
          size="small"
          tone="secondary"
          accessibleLabel={m.drawing_redo()}
          tooltip={m.drawing_redo()}
          icon="i-tabler-arrow-forward-up"
          disabled={!props.canRedo}
          onPress={props.onRedo}
        />
        <PButton
          bordered
          transparent
          size="small"
          tone="secondary"
          accessibleLabel={m.picture_diary_clear()}
          tooltip={m.picture_diary_clear()}
          icon="i-tabler-trash"
          disabled={!props.canClear}
          onPress={props.onClear}
        />
      </div>
      {props.children}
    </Show>
    <PButton
      raised
      class="ml-auto"
      size="small"
      disabled={props.doneDisabled}
      onPress={props.onDone}
    >
      {m.picture_diary_drawing_done()}
    </PButton>
  </div>
)
