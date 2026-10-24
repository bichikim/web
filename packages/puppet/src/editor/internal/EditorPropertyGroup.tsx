import type {JSX} from 'solid-js'

interface EditorPropertyGroupProps {
  readonly children?: JSX.Element
  readonly class?: string
  readonly title: string
  /** Explanation shown as the title's tooltip instead of persistent text. */
  readonly tooltip?: string
}

export const EditorPropertyGroup = (props: EditorPropertyGroupProps) => (
  <fieldset class={`deformer-properties ${props.class ?? ''}`}>
    <legend data-tooltip={props.tooltip}>{props.title}</legend>
    {props.children}
  </fieldset>
)
