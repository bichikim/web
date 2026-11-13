import {type JSX, onCleanup} from 'solid-js'

interface EditorParameterItemFooterProps {
  readonly children?: JSX.Element
  readonly clickState: {ignore: boolean}
}

export const EditorParameterItemFooter = (props: EditorParameterItemFooterProps) => (
  <div
    ref={(element) => {
      const capture = (event: MouseEvent) => {
        if (props.clickState.ignore) {
          props.clickState.ignore = false
          event.preventDefault()
          event.stopPropagation()
        }
      }
      element.addEventListener('click', capture, true)
      onCleanup(() => element.removeEventListener('click', capture, true))
    }}
  >
    {props.children}
  </div>
)
