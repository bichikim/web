import {For, Show} from 'solid-js'
import {Handle, Position} from '@dschz/solid-flow'
import {EditorButton, EditorNumberField} from '../../design-system'
import {EditorContextMenu} from '../../editor/internal/EditorContextMenu'
import {addLocalInput, getLocalInputIds, removeLocalInput} from '../../tracking/local-inputs'
import {useMappingGraph} from './context'
import {InputGroup} from './InputGroup'
interface LocalInputNodeProps {
  readonly kind: 'manualValue' | 'buttonValue'
}
export const LocalInputNode = (props: LocalInputNodeProps) => {
  const graph = useMappingGraph()
  const manual = () => props.kind === 'manualValue'
  const name = () => (manual() ? '수동 입력' : '버튼 입력')
  const inputs = () =>
    getLocalInputIds(graph.controls.profile()).filter((id) => id.split(':')[0] === props.kind)
  const add = () => {
    const profile = graph.controls.profile()
    if (profile !== undefined) {
      graph.controls.updateProfile(addLocalInput(profile, `${props.kind}:${crypto.randomUUID()}`))
    }
  }
  return (
    <InputGroup
      id={manual() ? 'manual' : 'button'}
      name={name()}
      label={`${name()} 그룹`}
      icon={manual() ? 'puppet-icon-manual-input' : 'puppet-icon-click'}
      inputs={inputs()}
      onAdd={add}
    >
      <For each={inputs()}>
        {(input, index) => {
          const label = () => (input === props.kind ? name() : `${name()} ${index() + 1}`)
          const value = () => graph.controls.inputValues()[input] ?? 0
          const remove = () => {
            const profile = graph.controls.profile()
            if (profile !== undefined) {
              graph.controls.updateProfile(removeLocalInput(profile, input))
            }
          }
          return (
            <EditorContextMenu
              label={`${label()} 작업`}
              triggerClass="block"
              onContextMenu={(event) => event.stopPropagation()}
              entries={[
                {id: 'delete', label: '삭제', onSelect: remove, tone: 'danger', type: 'action'},
              ]}
            >
              <div class="puppet-graph-port nodrag nopan" aria-label={`${label()} 항목`}>
                <Show when={manual()}>
                  <span class="shrink-0">입력 {index() + 1}</span>
                </Show>
                {manual() ? (
                  <EditorNumberField
                    label={`${label()}값`}
                    minimum={0}
                    maximum={1}
                    step={0.01}
                    value={value()}
                    onValueChange={(value) => graph.controls.setInputValue(input, value)}
                  />
                ) : (
                  <EditorButton
                    aria-label={`${label()} 토글`}
                    aria-pressed={value() === 1}
                    onClick={() => graph.controls.setInputValue(input, value() === 1 ? 0 : 1)}
                  >
                    {label()} · {value() === 1 ? '켜짐 · 1' : '꺼짐 · 0'}
                  </EditorButton>
                )}
                <Handle
                  type="source"
                  position={Position.Right}
                  id={input}
                  aria-label={`${label()} 출력 포트`}
                />
              </div>
            </EditorContextMenu>
          )
        }}
      </For>
    </InputGroup>
  )
}
