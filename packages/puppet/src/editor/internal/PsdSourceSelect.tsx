import {Show} from 'solid-js'
import {EditorSelect} from '../../design-system'
import type {PsdReimportPlan} from './psd-reimport'

interface PsdSourceSelectProps {
  readonly plan: PsdReimportPlan
  readonly onChange: (id: string) => void
}
export const PsdSourceSelect = (props: PsdSourceSelectProps) => (
  <Show when={props.plan.sources.length > 1}>
    <EditorSelect
      label="갱신할 PSD 원본"
      value={props.plan.sourceId}
      options={props.plan.sources.map((source) => source.id)}
      optionLabel={(id) =>
        props.plan.sources.find((source) => source.id === id)?.name ?? '원본 선택'
      }
      onChange={props.onChange}
    />
    <Show when={props.plan.sourceId === undefined}>
      <p>갱신할 원본을 선택하세요. 다른 PSD의 레이어는 변경하지 않습니다.</p>
    </Show>
  </Show>
)
