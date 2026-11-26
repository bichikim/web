import {type JSX} from '@solidjs/web'
import {onCleanup} from 'solid-js'

interface EditorParameterItemFooterProps {
  readonly children?: JSX.Element
  readonly clickState: {ignore: boolean}
}

export const EditorParameterItemFooter = (props: EditorParameterItemFooterProps) => {
  let footer: HTMLDivElement | undefined
  const capture = (event: MouseEvent) => {
    if (props.clickState.ignore) {
      props.clickState.ignore = false
      event.preventDefault()
      event.stopPropagation()
    }
  }
  const bind = (element: HTMLDivElement) => {
    footer = element
    element.addEventListener('click', capture, true)
  }
  onCleanup(() => footer?.removeEventListener('click', capture, true))
  return <div ref={bind}>{props.children}</div>
}
