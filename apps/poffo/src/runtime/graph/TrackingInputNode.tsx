import {InputGroup} from './InputGroup'
import {For} from 'solid-js'
import {Handle, Position} from '@dschz/solid-flow'
import {TRACKING_INPUTS} from '../../tracking/types'
import {TRACKING_LABELS} from '../../tracking/tracking-inputs'
import {useMappingGraph} from './context'
const DISPLAY_DIGITS = 3
export const TrackingInputNode = () => {
  const graph = useMappingGraph()
  return (
    <InputGroup
      id="tracking"
      name="카메라 입력"
      label="카메라 입력"
      icon="puppet-icon-camera"
      inputs={TRACKING_INPUTS}
    >
      <For each={TRACKING_INPUTS}>
        {(input) => (
          <div class="puppet-graph-port">
            <span>{TRACKING_LABELS[input]}</span>
            <output>
              {graph.controls.trackingInputs()?.[input]?.toFixed(DISPLAY_DIGITS) ?? '—'}
            </output>
            <Handle
              type="source"
              position={Position.Right}
              id={input}
              aria-label={`${TRACKING_LABELS[input]} 출력 포트`}
            />
          </div>
        )}
      </For>
    </InputGroup>
  )
}
