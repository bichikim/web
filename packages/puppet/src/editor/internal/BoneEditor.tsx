import {DeformerMode} from './DeformerMode'
import {ToggleButton} from '@kobalte/core/toggle-button'
import {Button} from '@kobalte/core/button'
import {For, Show} from 'solid-js'
import {useBoneEditor, type UseBoneEditorProps} from './use-bone-editor'

export const BoneEditor = (props: UseBoneEditorProps) => {
  const editor = useBoneEditor(props)
  const MINIMUM_COORDINATES = 4
  const controls = (
    <div class="bone-tools" role="group" aria-label="본 편집 도구">
      <div class="mask-actions">
        <DeformerMode
          mode={editor.mode()}
          restEditable={editor.restEditable()}
          onChange={editor.setMode}
        />
        <Show when={editor.mode() === 'pose'}>
          <ToggleButton
            class="mask-action-button"
            pressed={editor.inverse()}
            title="끝 관절을 끌면 앞쪽 관절들이 함께 따라옵니다."
            onClick={editor.toggleInverse}
          >
            끝 관절 IK
          </ToggleButton>
        </Show>
        <Show when={editor.mode() === 'rest'}>
          <Button
            class="mask-action-button"
            disabled={
              editor.selected() === null ||
              editor.selected() === 0 ||
              editor.points().length <= MINIMUM_COORDINATES
            }
            onClick={() => editor.changeRest('remove', editor.selected() ?? undefined)}
          >
            관절 삭제
          </Button>
        </Show>
      </div>
      <p class="mask-empty-state">
        <Show
          when={editor.mode() === 'rest'}
          fallback={
            editor.inverse()
              ? '끝 관절을 끌어 체인을 움직입니다. 첫 관절과 본 길이는 유지됩니다.'
              : '관절을 끌어 본을 회전합니다. 첫 관절은 전체를 이동합니다.'
          }
        >
          본 선을 더블클릭하면 중간에, 빈 곳을 더블클릭하면 끝에 관절을 추가합니다. 메시 모양은
          유지됩니다.
        </Show>
      </p>
      <Show when={editor.bound()}>
        <p class="mask-empty-state">
          기준 배치는 파라미터 연결 전에 편집하세요. 변형을 저장할 키폼을 선택하세요.
        </p>
      </Show>
    </div>
  )
  return (
    <div class="deformer-editor">
      <svg
        ref={editor.bind}
        aria-label="본 디포머 편집 영역"
        tabindex={0}
        viewBox={editor.viewBox()}
        on:keydown={editor.keyDown}
        on:dblclick={(event) => {
          if (event.target !== event.currentTarget) {
            return
          }
          const position = editor.eventPoint(event)
          if (position !== undefined) {
            editor.changeRest('append', undefined, position)
          }
        }}
        onPointerMove={editor.drag}
        onPointerUp={editor.stop}
        onLostPointerCapture={editor.stop}
        onPointerCancel={editor.stop}
      >
        <For each={editor.indices().slice(1)}>
          {(index) => (
            <>
              <line
                x1={editor.point(index - 1).x}
                y1={editor.point(index - 1).y}
                x2={editor.point(index).x}
                y2={editor.point(index).y}
              />
              <Show when={editor.mode() === 'rest' && editor.editable()}>
                <line
                  class="bone-hit"
                  x1={editor.point(index - 1).x}
                  y1={editor.point(index - 1).y}
                  x2={editor.point(index).x}
                  y2={editor.point(index).y}
                  on:dblclick={(event) => {
                    event.stopPropagation()
                    const position = editor.eventPoint(event)
                    if (position !== undefined) {
                      editor.changeRest('insert', index, position)
                    }
                  }}
                />
              </Show>
            </>
          )}
        </For>
        <For each={editor.indices()}>
          {(index) => (
            <circle
              role="button"
              aria-label={`본 관절 ${index + 1}`}
              aria-pressed={editor.selected() === index}
              aria-disabled={!editor.editable()}
              tabindex={editor.editable() ? 0 : -1}
              cx={editor.point(index).x}
              cy={editor.point(index).y}
              classList={{selected: editor.selected() === index}}
              r={editor.radius()}
              onFocus={() => editor.setSelected(index)}
              onPointerDown={(event) => editor.start(event, index)}
            />
          )}
        </For>
      </svg>
      {props.renderControls === undefined ? controls : props.renderControls(controls)}
    </div>
  )
}
