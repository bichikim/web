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
    <svg
      aria-hidden="true"
      class="layer-tree-toggle-icon puppet-layer-tree-toggle-icon"
      classList={{expanded: props.expanded}}
      viewBox="0 0 16 16"
    >
      <path d="M4 2.5 13 8 4 13.5Z" />
    </svg>
  </Collapsible.Trigger>
)
