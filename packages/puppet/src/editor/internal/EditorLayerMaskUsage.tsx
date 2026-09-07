import {Show} from 'solid-js'

export interface EditorLayerMaskUsageProps {
  readonly count: number
}

export const EditorLayerMaskUsage = (props: EditorLayerMaskUsageProps) => (
  <Show when={props.count > 0}>
    <span
      aria-label={`${props.count}개 파츠의 마스크로 사용`}
      class="layer-mask-usage puppet-layer-mask-usage"
    >
      <span aria-hidden="true" class="puppet-icon puppet-icon-layers-intersect" />
      {props.count}
    </span>
  </Show>
)
