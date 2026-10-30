import {onCleanup} from 'solid-js'

interface EditorBrushSettingsMountProps {
  readonly setMount: (element: HTMLDivElement | undefined) => void
}

export const EditorBrushSettingsMount = (props: EditorBrushSettingsMountProps) => {
  onCleanup(() => props.setMount(undefined))
  return <div class="toolbar-brush-settings-mount" ref={props.setMount} />
}
