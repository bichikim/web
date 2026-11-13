import {useCorrectionSections} from './use-correction-sections'
import {EditableCardName} from './EditableCardName'
import {getInputLabel} from '../../tracking/tracking-inputs'
import {Show} from 'solid-js'
import {Handle, type NodeProps, Position} from '@dschz/solid-flow'
import {EditorButton, EditorCheckbox, EditorNumberField} from '@winter-love/puppet/editor'
import type {ParameterMapping} from '../../tracking/types'
import {MappingBaseline} from '../MappingBaseline'
import {MappingBounds} from '../MappingBounds'
import {useMappingGraph} from './context'
const DISPLAY_DIGITS = 3
const formatValue = (value: number | undefined) =>
  value === undefined || !Number.isFinite(value) ? '—' : value.toFixed(DISPLAY_DIGITS)
export const CorrectionNode = (props: NodeProps) => {
  const graph = useMappingGraph()
  const mapping = () =>
    graph.controls
      .profile()
      ?.mappings.find((candidate) => `mapping:${candidate.parameterId}` === props.id)
  const parameter = () =>
    graph.parameters().find((candidate) => candidate.id === mapping()?.parameterId)
  const update = (patch: Partial<ParameterMapping>) => {
    const current = mapping()
    if (current !== undefined) {
      graph.controls.updateMapping({...current, ...patch})
    }
  }
  const reset = () => {
    const current = mapping()
    if (current !== undefined) {
      const {baseline: _baseline, ...rest} = current
      graph.controls.updateMapping(rest)
    }
  }
  const sections = useCorrectionSections({
    controls: graph.controls,
    parameterId: () => mapping()?.parameterId,
  })
  const reverse = () => {
    const current = mapping()
    if (current !== undefined) {
      update({outputMaximum: current.outputMinimum, outputMinimum: current.outputMaximum})
    }
  }
  return (
    <Show when={mapping()}>
      {(current) => (
        <article class="puppet-graph-correction" aria-label={`${parameter()?.name} 보정 카드`}>
          <Handle
            type="target"
            position={Position.Left}
            aria-label={`${parameter()?.name} 보정 입력 포트`}
          />
          <header class="puppet-graph-title puppet-correction-title">
            <EditableCardName
              name={
                current().name ??
                (current().inputConnected === false && current().parameterId.startsWith('draft:')
                  ? '출력 보정'
                  : `${getInputLabel(current().input)} 출력 보정`)
              }
              label="보정 이름"
              onRename={(name) => update({name})}
            />
            <EditorButton
              class="nodrag nopan"
              aria-expanded={!current().collapsed}
              aria-label={`${parameter()?.name} 보정 ${current().collapsed ? '펼치기' : '접기'}`}
              onClick={() => update({collapsed: !current().collapsed})}
            >
              <span
                class={
                  current().collapsed ? 'puppet-icon-chevron-right' : 'puppet-icon-chevron-down'
                }
                aria-hidden="true"
              />
            </EditorButton>
          </header>
          <div class="nodrag nopan puppet-graph-fields">
            <div class="puppet-correction-values">
              <div>
                <span>입력</span>
                <output aria-label={`${parameter()?.name} 현재 입력값`}>
                  {formatValue(
                    current().inputConnected === false
                      ? undefined
                      : graph.controls.mappingInputs()[current().input],
                  )}
                </output>
              </div>
              <span aria-hidden="true">→</span>
              <div>
                <span>출력</span>
                <output aria-label={`${parameter()?.name} 보정된 출력값`}>
                  {formatValue(graph.controls.correctionValues()[current().parameterId])}
                </output>
              </div>
            </div>
            <Show when={!current().collapsed}>
              <div class="puppet-runtime-actions">
                <EditorCheckbox
                  inputId={`${props.id}-enabled`}
                  label={`${parameter()?.name} 추적 활성화`}
                  checked={current().enabled}
                  onChange={(enabled) => update({enabled})}
                />
                <label for={`${props.id}-enabled`}>추적 활성화</label>
              </div>
              <label>
                감도
                <EditorNumberField
                  label={`${parameter()?.name} 연결 감도`}
                  minimum={0.1}
                  maximum={50}
                  step={0.1}
                  value={current().multiplier ?? 1}
                  unit="×"
                  onValueChange={(multiplier) => update({multiplier})}
                />
              </label>
              <MappingBaseline
                label={parameter()?.name ?? current().parameterId}
                baseline={
                  current().baseline ??
                  Math.min(
                    Math.max(0, Math.min(current().inputMinimum, current().inputMaximum)),
                    Math.max(current().inputMinimum, current().inputMaximum),
                  )
                }
                value={() => graph.controls.mappingInputs()?.[current().input]}
                onChange={(baseline) => update({baseline})}
                onReset={reset}
              />
              <Show when={parameter()}>
                {(target) => (
                  <MappingBounds
                    label={target().name}
                    mapping={current()}
                    parameter={target()}
                    onChange={update}
                    onReverse={reverse}
                    expandedSections={sections.expandedSections()}
                    onSectionToggle={sections.toggleSection}
                  />
                )}
              </Show>
            </Show>
          </div>
          <Handle
            type="source"
            position={Position.Right}
            aria-label={`${parameter()?.name} 보정 출력 포트`}
          />
        </article>
      )}
    </Show>
  )
}
