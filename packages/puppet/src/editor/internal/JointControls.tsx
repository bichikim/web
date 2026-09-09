import {For, Show} from 'solid-js'
import type {useBoneEditor} from './use-bone-editor'

interface JointControlsProps {
  readonly editor: ReturnType<typeof useBoneEditor>
  readonly rotation?: boolean
}

export const JointControls = (props: JointControlsProps) => (
  <For each={props.editor.indices()}>
    {(index) => (
      <g classList={{blocked: !props.editor.editable()}}>
        <circle
          role="button"
          aria-label={
            props.rotation
              ? index === 0
                ? '회전 중심점'
                : '회전 방향 손잡이'
              : `본 관절 ${index + 1}`
          }
          aria-pressed={props.editor.selected() === index}
          aria-disabled={!props.editor.editable()}
          tabindex={props.editor.editable() ? 0 : -1}
          cx={props.editor.point(index).x}
          cy={props.editor.point(index).y}
          classList={{
            'rotation-origin-hit': props.rotation && index === 0,
            selected: props.editor.selected() === index && !(props.rotation && index === 0),
            'angle-handle': props.rotation && index === 1,
            'joint-origin-hit': props.rotation && index === 0,
          }}
          r={props.editor.radius()}
          onFocus={() => props.editor.setSelected(index)}
          onPointerDown={(event) => props.editor.start(event, index)}
        />
        <Show when={props.rotation && index === 0}>
          <circle
            aria-hidden="true"
            class="rotation-origin joint-origin"
            classList={{selected: props.editor.selected() === index}}
            cx={props.editor.point(index).x}
            cy={props.editor.point(index).y}
            r={props.editor.radius()}
          />
        </Show>
      </g>
    )}
  </For>
)
