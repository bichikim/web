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
      <svg aria-hidden="true" viewBox="0 0 16 16">
        <path d="M3 3h7v7H3z" />
        <path d="M6 6h7v7H6z" />
      </svg>
      {props.count}
    </span>
  </Show>
)
