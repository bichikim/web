import {Show} from 'solid-js'
import {DeformerMode, type DeformerModeProps} from './DeformerMode'

export const DeformerTools = (props: DeformerModeProps) => (
  <div class="bone-tools" role="group" aria-label="디포머 편집 도구">
    <div class="mask-actions">
      <DeformerMode {...props} />
    </div>
    <p class="mask-empty-state">
      {props.mode === 'rest'
        ? '메시 모양을 유지하며 제어점의 기준 위치를 배치합니다.'
        : '제어점을 움직여 메시 모양을 변형합니다.'}
    </p>
    <Show when={props.restEditable === false}>
      <p class="mask-empty-state">기준 배치는 잠금을 해제하고 파라미터 연결 전에 편집하세요.</p>
    </Show>
  </div>
)
