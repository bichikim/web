import {type JSX, Show} from 'solid-js'

interface EditorBindingSettingsToggleProps {
  readonly controlsId: string
  readonly expanded: boolean
  readonly label?: string
  readonly onToggle: () => void
}

export const EditorBindingSettingsToggle = (props: EditorBindingSettingsToggleProps) => (
  <Show when={props.label}>
    {(label) => (
      <button
        aria-controls={props.controlsId}
        aria-expanded={props.expanded}
        class="binding-settings-toggle"
        type="button"
        onClick={props.onToggle}
      >
        <span>{label()}</span>
        <span
          aria-hidden="true"
          class="binding-settings-chevron puppet-icon puppet-icon-chevron-down"
        />
      </button>
    )}
  </Show>
)

interface EditorBindingSettingsDrawerProps {
  readonly children?: JSX.Element
  readonly expanded: boolean
  readonly id: string
  readonly label: string
}

export const EditorBindingSettingsDrawer = (props: EditorBindingSettingsDrawerProps) => (
  <Show when={props.expanded}>
    <section aria-label={props.label} class="binding-settings-drawer" id={props.id}>
      {props.children}
    </section>
  </Show>
)
