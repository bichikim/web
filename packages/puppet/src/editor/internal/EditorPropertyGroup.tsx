import type {JSX} from 'solid-js'

interface EditorPropertyGroupProps {
  readonly children?: JSX.Element
  readonly class?: string
  readonly title: string
}

export const EditorPropertyGroup = (props: EditorPropertyGroupProps) => (
  <fieldset class={`deformer-properties ${props.class ?? ''}`}>
    <legend>{props.title}</legend>
    {props.children}
  </fieldset>
)
