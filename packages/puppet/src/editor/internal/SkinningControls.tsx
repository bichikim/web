import {WeightBrushControls} from './WeightBrushControls'
import {WeightToolButtons} from './WeightToolButtons'
import type {WeightPaintMode} from './weight-paint'
import {createSignal, Show} from 'solid-js'
import {getDocumentScene, type PuppetDocument} from '../../player'
import {findNode} from './scene-tree'
import {EditorButton, EditorCheckbox, EditorNumberField} from '../../design-system'
import type {useSkinningTools} from './use-skinning-tools'
const PERCENT = 100
interface SkinningControlsProps {
  readonly state: ReturnType<typeof useSkinningTools>
  readonly sourceDocument: PuppetDocument
}
export const SkinningControls = (props: SkinningControlsProps) => {
  const [brushMode, setBrushMode] = createSignal<WeightPaintMode>('add')
  return (
    <Show when={props.state.binding() !== undefined}>
      <fieldset class="deformer-properties">
        <legend>스키닝 변형 확인</legend>
        <label>
          <span>가중치 편집</span>
          <EditorCheckbox
            label="스키닝 가중치 편집"
            checked={props.state.enabled()}
            onChange={props.state.setEnabled}
          />
        </label>
        <Show when={props.state.enabled()}>
          <label>
            <span>관절</span>
            <span>
              {(() => {
                const id = props.state.binding()?.influences[props.state.target()]?.nodeId
                return id === undefined
                  ? '레이어에서 관절 선택'
                  : (findNode(getDocumentScene(props.sourceDocument).roots, id)?.name ?? id)
              })()}
            </span>
          </label>
          <WeightToolButtons
            tool={props.state.tool() === 'select' ? 'select' : 'paint'}
            onChange={(tool) => props.state.setTool(tool === 'select' ? 'select' : brushMode())}
          />
          <div class="weight-legend">
            <span>0%</span>
            <span class="weight-legend-ramp" />
            <span>100%</span>
          </div>
          <Show when={props.state.tool() !== 'select'}>
            <WeightBrushControls
              mode={brushMode()}
              radius={props.state.radius()}
              strength={props.state.amount()}
              labelPrefix="스키닝 "
              onModeChange={(mode) => {
                setBrushMode(mode)
                props.state.setTool(mode)
              }}
              onRadiusChange={props.state.setRadius}
              onStrengthChange={props.state.setAmount}
            />
            <label>
              <span>끝점 보호</span>
              <EditorCheckbox
                label="스키닝 0·100% 정점 보호"
                checked={props.state.protect()}
                onChange={props.state.setProtect}
              />
            </label>
          </Show>
          <div class="weight-tool-options">
            <EditorButton
              onClick={() =>
                props.state.setSelected(
                  props.state.binding()!.influences[0]!.weights.map((_, index) => index),
                )
              }
            >
              전체 선택
            </EditorButton>
            <EditorButton onClick={() => props.state.setSelected([])}>선택 해제</EditorButton>
          </div>
          <span>선택 {props.state.selected().length}개 · Shift로 추가 선택</span>
          <Show when={props.state.selected().length > 0}>
            <label>
              <span>가중치</span>
              <EditorNumberField
                label="선택 정점 스키닝 가중치"
                minimum={0}
                maximum={PERCENT}
                unit="%"
                value={props.state.value()}
                onValueChange={props.state.setValue}
              />
            </label>
            <EditorButton disabled={props.state.locked()} onClick={props.state.apply}>
              선택 정점에 적용
            </EditorButton>
          </Show>
          <span role="status">
            뒤집힘 {props.state.triangles().filter((triangle) => triangle.flipped).length}개 ·
            늘어남 {props.state.triangles().filter((triangle) => triangle.stretched).length}개
          </span>
          <span>빨강: 뒤집힘 · 노랑: 원래 변 길이의 2배 초과</span>
        </Show>
      </fieldset>
    </Show>
  )
}
