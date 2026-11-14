import {ToggleButton} from '@kobalte/core/toggle-button'
import {Show} from 'solid-js'
import type {MeshBrushControlsProps} from './types'

export const MeshBrushControls = (props: MeshBrushControlsProps) => {
  return (
    <div class="mesh-editing-toolbar" role="group" aria-label="메시 편집">
      <Show when={props.modeControls}>{props.modeControls}</Show>
      <Show when={props.modeControls}>
        <span class="mesh-editing-separator" aria-hidden="true" />
      </Show>
      <div
        class="editor-control editor-segmented-field deform-brush-toolbar"
        data-control-size="md"
        data-size="md"
        role="group"
        aria-label="편집 도구"
      >
        <ToggleButton
          type="button"
          aria-label="정점 선택·이동"
          title="정점 선택·이동"
          pressed={!props.editor.brushEnabled()}
          onClick={() => props.editor.setBrushEnabled(false)}
        >
          <span class="puppet-icon puppet-icon-pointer" aria-hidden="true" />
          <span class="editor-segmented-label" aria-hidden="true">
            정점 선택·이동
          </span>
        </ToggleButton>
        <ToggleButton
          type="button"
          aria-label="변형 브러시"
          title="변형 브러시"
          pressed={props.editor.brushEnabled() && props.editor.brushMode() === 'move'}
          onClick={() => props.editor.setBrushMode('move')}
        >
          <span class="puppet-icon puppet-icon-brush" aria-hidden="true" />
          <span class="editor-segmented-label" aria-hidden="true">
            변형 브러시
          </span>
        </ToggleButton>
        <ToggleButton
          type="button"
          aria-label="팽창·수축 브러시"
          title="오른쪽으로 드래그하면 팽창, 왼쪽이나 Shift 드래그는 수축"
          pressed={props.editor.brushEnabled() && props.editor.brushMode() === 'expand'}
          onClick={() => props.editor.setBrushMode('expand')}
        >
          <span class="puppet-icon puppet-icon-brush-expand" aria-hidden="true" />
          <span class="editor-segmented-label" aria-hidden="true">
            팽창·수축
          </span>
        </ToggleButton>
        <ToggleButton
          type="button"
          aria-label="정점 부드럽게 브러시"
          title="연결된 이웃 정점을 기준으로 내부 정점을 부드럽게 정리합니다. 외곽선은 유지합니다."
          pressed={props.editor.brushEnabled() && props.editor.brushMode() === 'smooth'}
          disabled={!props.editor.canSmooth()}
          onClick={() => props.editor.setBrushMode('smooth')}
        >
          <span class="puppet-icon puppet-icon-brush-smooth" aria-hidden="true" />
          <span class="editor-segmented-label" aria-hidden="true">
            부드럽게
          </span>
        </ToggleButton>
      </div>
    </div>
  )
}
