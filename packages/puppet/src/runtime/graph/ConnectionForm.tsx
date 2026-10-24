import {isGroupControlled} from '../../tracking/is-group-controlled'
import {createSignal, untrack} from 'solid-js'
import {EditorButton, EditorSelect} from '../../design-system'
import {MAPPING_INPUTS, type ParameterMapping} from '../../tracking/types'
import {getInputNode, TRACKING_LABELS} from '../../tracking/tracking-inputs'
import {useMappingGraph} from './context'
import type {GraphConnection} from './resolve-connection'
interface ConnectionFormProps {
  readonly mapping: ParameterMapping
  readonly onConnect: (connection: GraphConnection) => void
  readonly onClose: () => void
}
export const ConnectionForm = (props: ConnectionFormProps) => {
  const graph = useMappingGraph()
  const [input, setInput] = createSignal(untrack(() => props.mapping.input))
  const available = () =>
    graph.parameters().filter(
      (parameter) =>
        !isGroupControlled({
          groups: graph.controls.profile()?.groups ?? [],
          parameterId: parameter.id,
        }) &&
        (parameter.id === props.mapping.parameterId ||
          !graph.controls
            .profile()
            ?.mappings.some((mapping) => mapping.parameterId === parameter.id)),
    )
  const [parameter, setParameter] = createSignal(untrack(() => props.mapping.parameterId))
  const apply = () => {
    const target = parameter()
    const existing = props.mapping
    props.onConnect({
      source: getInputNode(input()),
      sourceHandle: input(),
      target: `mapping:${existing.parameterId}`,
    })
    props.onConnect({
      source: `mapping:${existing.parameterId}`,
      target: 'parameters',
      targetHandle: target,
    })
    props.onClose()
  }
  const handleInputChange = (value: string) => {
    const selected = MAPPING_INPUTS.find((candidate) => candidate === value)
    if (selected !== undefined) {
      setInput(selected)
    }
  }
  return (
    <section class="puppet-connection-form" aria-label="연결 변경 설정">
      <label>
        입력
        <EditorSelect
          label="연결 입력"
          options={MAPPING_INPUTS}
          value={input()}
          optionLabel={(value) => TRACKING_LABELS[value as keyof typeof TRACKING_LABELS]}
          onChange={handleInputChange}
        />
      </label>
      <label>
        모델 파라미터
        <EditorSelect
          label="연결 모델 파라미터"
          options={available().map((item) => item.id)}
          value={parameter()}
          optionLabel={(id) => graph.parameters().find((item) => item.id === id)?.name ?? id}
          onChange={setParameter}
        />
      </label>
      <EditorButton onClick={apply}>적용</EditorButton>
      <EditorButton onClick={props.onClose}>취소</EditorButton>
    </section>
  )
}
