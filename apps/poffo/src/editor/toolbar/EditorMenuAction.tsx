import {Button} from '@kobalte/core/button'
import {Show} from 'solid-js'

interface EditorMenuActionProps {
  readonly label: string
  readonly onClose: () => void
  readonly onSelect?: () => void
}

/** A menu button that closes the menu and runs `onSelect`; hidden without it. */
export const EditorMenuAction = (props: EditorMenuActionProps) => (
  <Show when={props.onSelect}>
    {(select) => (
      <Button
        type="button"
        onClick={() => {
          props.onClose()
          select()()
        }}
      >
        {props.label}
      </Button>
    )}
  </Show>
)
