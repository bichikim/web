import {isGroupControlled} from '../../tracking/is-group-controlled'
import {Handle, type NodeProps, Position} from '@dschz/solid-flow'
import {Show} from 'solid-js'
import {useMappingGraph} from './context'
const DISPLAY_DIGITS = 3
export const ParameterOutputNode = (props: NodeProps) => {
  const graph = useMappingGraph()
  const parameter = () =>
    graph.parameters().find((parameter) => `parameter:${parameter.id}` === props.id)
  const grouped = () =>
    graph.controls
      .profile()
      ?.groups?.some((group) => group.parameterIds.some((id) => `parameter:${id}` === props.id)) ??
    false
  return (
    <Show when={parameter()}>
      {(current) => (
        <section
          class="puppet-parameter-block"
          classList={{'puppet-parameter-row': grouped() && !props.dragging}}
          aria-label={`${current().name} 파라미터`}
        >
          <span>{current().name}</span>
          <Show
            when={
              !isGroupControlled({
                groups: graph.controls.profile()?.groups ?? [],
                parameterId: current().id,
              })
            }
          >
            <Handle
              type="target"
              position={Position.Left}
              id={current().id}
              aria-label={`${current().name} 입력 포트`}
            />
          </Show>
          <output>
            {(graph.controls.values()[current().id] ?? current().defaultValue).toFixed(
              DISPLAY_DIGITS,
            )}
          </output>
        </section>
      )}
    </Show>
  )
}
