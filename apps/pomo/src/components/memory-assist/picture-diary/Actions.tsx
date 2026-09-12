import {type JSX, Show} from 'solid-js'
import * as m from '@paraglide/message'
import {PButton} from '../../PButton'

interface ActionsProps {
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

export const Actions = (props: ActionsProps) => (
  <div class="grid grid-cols-[1fr_auto] items-center gap-3 xl:grid-cols-[auto_1fr_auto]">
    <Show when={props.drawing}>
      {props.children}
      <div class="flex shrink-0 gap-2 xl:col-start-1 xl:row-start-1">
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
    </Show>
    <PButton
      raised
      class="col-start-2 justify-self-end xl:col-start-3 xl:row-start-1"
      size="small"
      disabled={props.doneDisabled}
      onPress={props.onDone}
    >
      {m.picture_diary_drawing_done()}
    </PButton>
  </div>
)
