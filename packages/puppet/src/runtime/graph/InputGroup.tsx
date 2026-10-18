import {For, type JSX, Show} from 'solid-js'
import {Handle, Position} from '@dschz/solid-flow'
import {EditorButton} from '../../design-system'
import {useMappingGraph} from './context'
interface InputGroupProps {
  readonly id: string
  readonly name: string
  readonly label: string
  readonly icon: string
  readonly inputs: readonly string[]
  readonly onAdd?: () => void
  readonly children: JSX.Element
}
export const InputGroup = (props: InputGroupProps) => {
  const graph = useMappingGraph()
  const collapsed = () => graph.controls.profile()?.collapsedInputs?.includes(props.id) ?? false
  const toggle = () => {
    const profile = graph.controls.profile()
    if (profile !== undefined) {
      const ids = profile.collapsedInputs ?? []
      graph.controls.updateProfile({
        ...profile,
        collapsedInputs: collapsed() ? ids.filter((id) => id !== props.id) : [...ids, props.id],
      })
    }
  }
  return (
    <section class="puppet-graph-ports" aria-label={props.label}>
      <header class="puppet-input-title">
        <span class={`puppet-icon ${props.icon}`} aria-hidden="true" />
        <strong>{props.name}</strong>
        <Show when={props.onAdd}>
          <EditorButton
            class="nodrag nopan"
            aria-label={`${props.name} 추가`}
            onClick={() => props.onAdd?.()}
          >
            <span class="puppet-icon puppet-icon-plus" aria-hidden="true" />
          </EditorButton>
        </Show>
        <EditorButton
          class="nodrag nopan"
          aria-label={`${props.name} ${collapsed() ? '펼치기' : '접기'}`}
          aria-expanded={!collapsed()}
          onClick={toggle}
        >
          <span
            class={collapsed() ? 'puppet-icon-chevron-right' : 'puppet-icon-chevron-down'}
            aria-hidden="true"
          />
        </EditorButton>
      </header>
      <Show
        when={!collapsed()}
        fallback={
          <For each={props.inputs}>
            {(input) => (
              <Handle
                type="source"
                position={Position.Right}
                id={input}
                aria-label={`${input} 출력 포트`}
              />
            )}
          </For>
        }
      >
        {props.children}
      </Show>
    </section>
  )
}
