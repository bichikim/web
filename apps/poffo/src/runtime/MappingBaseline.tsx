import {type Accessor} from 'solid-js'
import {EditorButton, EditorNumberField} from '@winter-love/puppet/editor'

interface MappingBaselineProps {
  readonly label: string
  readonly baseline: number
  readonly value: Accessor<number | undefined>
  readonly onChange: (baseline: number) => void
  readonly onReset: () => void
}
export const MappingBaseline = (props: MappingBaselineProps) => (
  <>
    <label>
      기준값
      <EditorNumberField
        label={`${props.label} 연결 기준값`}
        step={0.01}
        value={props.baseline}
        onValueChange={(baseline) => props.onChange(baseline)}
      />
    </label>
    <div class="puppet-runtime-actions">
      <EditorButton
        disabled={props.value() === undefined}
        onClick={() => {
          const baseline = props.value()
          if (baseline !== undefined && Number.isFinite(baseline)) {
            props.onChange(baseline)
          }
        }}
      >
        현재값을 기준으로
      </EditorButton>
      <EditorButton
        onClick={() => {
          props.onReset()
        }}
      >
        기준값 초기화
      </EditorButton>
    </div>
  </>
)
