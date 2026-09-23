import {WeightSelectionControls} from './WeightSelectionControls'
import {EditorToggleButton} from '../../design-system'
import {For, Show} from 'solid-js'
import {WeightBrushControls} from './WeightBrushControls'
import {WeightToolButtons} from './WeightToolButtons'
import type {useDeformerWeights} from './use-deformer-weights'

export interface WeightPaintControlsProps {
  readonly editor: ReturnType<typeof useDeformerWeights>
}
export const WeightPaintControls = (props: WeightPaintControlsProps) => {
  const PERCENT = 100
  return (
    <>
      <WeightToolButtons tool={props.editor.tool()} onChange={props.editor.setTool} />
      <Show when={props.editor.isBone()}>
        <div class="weight-tool-options" role="group" aria-label="영향도를 편집할 본">
          <For each={props.editor.segments()}>
            {(segment) => (
              <EditorToggleButton
                class="mask-action-button"
                aria-label={`칠할 본 ${segment.index + 1}`}
                pressed={props.editor.boneIndex() === segment.index}
                onClick={() => props.editor.setBoneIndex(segment.index)}
              >
                본 {segment.index + 1}
              </EditorToggleButton>
            )}
          </For>
        </div>
      </Show>
      <div class="weight-legend" aria-label="영향도 색상: 파랑 0%, 빨강 100%">
        <span>0%</span>
        <span class="weight-legend-ramp" />
        <span>100%</span>
      </div>
      <Show
        when={props.editor.tool() === 'paint'}
        fallback={<WeightSelectionControls editor={props.editor} />}
      >
        <WeightBrushControls
          mode={props.editor.brush.mode()}
          radius={props.editor.brush.radius()}
          strength={props.editor.brush.strength() * PERCENT}
          maximumRadius={500}
          onModeChange={props.editor.brush.setMode}
          onRadiusChange={props.editor.brush.setRadius}
          onStrengthChange={(value) => props.editor.brush.setStrength(value / PERCENT)}
        />
        <p class="mask-empty-state">
          드래그하여 칠하세요. 다시 칠하면 효과가 더해집니다. 잠긴 파트는 제외됩니다. 부드럽게는
          주변 영향도를 고르게 만듭니다. 주변 값이 모두 같으면 변화가 없습니다.
        </p>
      </Show>
      <Show when={!props.editor.isBone()}>
        <p class="mask-empty-state">
          0%는 변형 전 위치, 100%는 디포머의 변형을 전부 적용합니다. 처음에는 100%이므로 빼기로
          시작하세요.
        </p>
      </Show>
      <Show when={props.editor.segments().length === 1}>
        <p class="mask-empty-state">
          본이 하나일 때 0%는 원래 위치, 100%는 본을 완전히 따라갑니다. 처음에는 100%이므로 빼기로
          시작하세요.
        </p>
      </Show>
    </>
  )
}
