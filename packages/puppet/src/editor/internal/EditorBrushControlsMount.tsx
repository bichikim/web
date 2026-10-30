import {onCleanup} from 'solid-js'

interface EditorBrushControlsMountProps {
  readonly setMount: (element: HTMLDivElement | undefined) => void
}

export const EditorBrushControlsMount = (props: EditorBrushControlsMountProps) => {
  onCleanup(() => props.setMount(undefined))
  return <div class="keyform-brush-mount" ref={props.setMount} />
}
