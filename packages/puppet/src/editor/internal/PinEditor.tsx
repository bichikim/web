import {Button} from '@kobalte/core/button'
import {For, Show} from 'solid-js'
import {DeformerMode} from './DeformerMode'
import {EditorNumberField} from './EditorNumberField'
import {type PinEditorProps, usePinEditor} from './use-pin-editor'

export const PinEditor = (props: PinEditorProps) => {
  const editor = usePinEditor(props)
  const controls = (
    <div class="bone-tools" role="group" aria-label="핀 편집 도구">
      <div class="mask-actions">
        <DeformerMode
          mode={props.deformerMode ?? 'pose'}
          restEditable={editor.restEditable()}
          onChange={(mode) => {
            editor.stop()
            props.onDeformerModeChange?.(mode)
          }}
        />
        <Show when={editor.rest()}>
          <Button
            class="mask-action-button"
            disabled={!editor.editable() || editor.indices().length <= 1}
            onClick={editor.remove}
          >
            핀 삭제
          </Button>
        </Show>
      </div>
      <p class="mask-empty-state">
        {editor.rest()
          ? '메시 모양을 유지하며 핀을 배치합니다. 빈 곳을 더블클릭하면 핀을 추가하고 Delete로 삭제합니다.'
          : '핀을 움직여 반경 안의 정점을 변형합니다. 겹치는 영향은 부드럽게 혼합됩니다.'}
      </p>
      <Show when={editor.selectedPin()}>
        {(pin) => (
          <fieldset class="deformer-properties">
            <legend>선택한 핀 {editor.selected() + 1}</legend>
            <label>
              영향 반경
              <EditorNumberField
                label="핀 영향 반경"
                value={pin().radius}
                minimum={1}
                disabled={!editor.restEditable()}
                onValueChange={(value) => editor.settings(value)}
                onEditStart={props.onEditStart}
                onEditEnd={props.onEditEnd}
              />
            </label>
            <label>
              강도
              <EditorNumberField
                label="핀 강도"
                value={pin().strength}
                minimum={0}
                maximum={1}
                step={0.05}
                disabled={!editor.restEditable()}
                onValueChange={(value) => editor.settings(undefined, value)}
                onEditStart={props.onEditStart}
                onEditEnd={props.onEditEnd}
              />
            </label>
          </fieldset>
        )}
      </Show>
      <Show when={!editor.restEditable()}>
        <p class="mask-empty-state">
          기준 배치·반경·강도는 파라미터 연결 전에 편집하세요. 변형을 저장할 키폼을 선택하세요.
        </p>
      </Show>
    </div>
  )
  return (
    <div class="deformer-editor">
      <svg
        ref={editor.bind}
        aria-label="핀 디포머 편집 영역"
        viewBox={editor.viewBox()}
        tabindex={0}
        on:dblclick={editor.append}
        on:keydown={editor.keyDown}
        onPointerMove={editor.drag}
        onPointerUp={editor.stop}
        onLostPointerCapture={editor.stop}
        onPointerCancel={editor.stop}
      >
        <path class="pin-influence" d={editor.influence()} />
        <For each={editor.indices()}>
          {(index) => (
            <circle
              aria-label={`핀 ${index + 1}`}
              role="button"
              aria-pressed={editor.selected() === index}
              aria-disabled={!editor.editable()}
              tabindex={editor.editable() ? 0 : -1}
              classList={{selected: editor.selected() === index}}
              cx={editor.point(index).x}
              cy={editor.point(index).y}
              r={editor.radius()}
              onFocus={() => editor.select(index)}
              onPointerDown={(event) => editor.start(event, index)}
            />
          )}
        </For>
      </svg>
      {props.renderControls === undefined ? controls : props.renderControls(controls)}
    </div>
  )
}
