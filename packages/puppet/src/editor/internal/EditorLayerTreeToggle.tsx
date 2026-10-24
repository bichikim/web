import {Collapsible} from '@kobalte/core/collapsible'

export interface EditorLayerTreeToggleProps {
  readonly expanded: boolean
  readonly name: string
}

export const EditorLayerTreeToggle = (props: EditorLayerTreeToggleProps) => (
  <Collapsible.Trigger
    aria-label={`${props.name} ${props.expanded ? '접기' : '펼치기'}`}
    class="layer-tree-toggle puppet-layer-tree-toggle"
  >
    <span
      aria-hidden="true"
      class="puppet-icon puppet-icon-caret-right-filled layer-tree-toggle-icon puppet-layer-tree-toggle-icon"
      classList={{expanded: props.expanded}}
    />
  </Collapsible.Trigger>
)
