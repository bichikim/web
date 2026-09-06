import {WeightPaintControls} from './WeightPaintControls'
import {Button} from '@kobalte/core/button'
import {ToggleButton} from '@kobalte/core/toggle-button'
import {For, Index, Show} from 'solid-js'
import {EditorNumberField} from './EditorNumberField'
import type {SelectedDeformerProps} from './DeformerEditor'
import {useDeformerWeights} from './use-deformer-weights'

export const DeformerWeights = (props: SelectedDeformerProps) => {
  const editor = useDeformerWeights(props)
  const PERCENT = 100
  const controls = (
    <div class="bone-tools">
      <ToggleButton class="mask-action-button" pressed={editor.enabled()} onClick={editor.toggle}>
        영향도 편집
      </ToggleButton>
      <Show when={editor.enabled()}>
        <WeightPaintControls editor={editor} />
        <Show when={editor.tool() === 'select'}>
          <Show
            when={editor.selected()}
            fallback={<p class="mask-empty-state">선택한 정점 없음</p>}
          >
            {(vertex) => (
              <fieldset class="deformer-properties" disabled={editor.locked()}>
                <legend>
                  {vertex().partId} · 정점 {vertex().vertexIndex + 1}
                </legend>
                <p class="mask-empty-state">{editor.manual() ? '수동 영향도' : '자동 영향도'}</p>
                <Index each={editor.weights()}>
                  {(weight, index) => (
                    <label>
                      {editor.isBone() ? `본 ${index + 1}` : '디포머'}
                      <EditorNumberField
                        label={editor.isBone() ? `본 ${index + 1} 영향도` : '디포머 영향도'}
                        value={weight() * PERCENT}
                        minimum={0}
                        maximum={100}
                        step={1}
                        unit="%"
                        disabled={editor.locked()}
                        onValueChange={(value) => editor.change(index, value / PERCENT)}
                        onEditStart={props.onEditStart}
                        onEditEnd={props.onEditEnd}
                      />
                    </label>
                  )}
                </Index>
                <Button
                  class="mask-action-button"
                  disabled={editor.locked() || !editor.manual()}
                  onClick={() => editor.change(0)}
                >
                  자동 영향도로 복원
                </Button>
              </fieldset>
            )}
          </Show>
        </Show>
      </Show>
    </div>
  )
  return (
    <>
      <Show when={editor.enabled()}>
        <svg
          aria-label="디포머 영향도 정점 선택"
          viewBox={editor.viewBox()}
          tabindex={0}
          classList={{'weight-paint-active': editor.tool() === 'paint'}}
          onPointerDown={editor.brush.start}
          onPointerMove={editor.brush.move}
          onPointerUp={editor.brush.end}
          onPointerCancel={editor.brush.end}
          onLostPointerCapture={editor.brush.end}
          onPointerLeave={editor.brush.leave}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.preventDefault()
              editor.brush.stop()
            }
          }}
        >
          <For each={editor.triangles()}>
            {(triangle) => (
              <polygon
                class="weight-heatmap"
                points={triangle.points}
                style={{'--weight': triangle.weight}}
              />
            )}
          </For>
          <For each={editor.segments()}>
            {(segment) => (
              <text class="bone-weight-label" x={segment.x} y={segment.y}>
                본 {segment.index + 1}
              </text>
            )}
          </For>
          <For each={editor.vertices()}>
            {(vertex) => (
              <circle
                class="bone-weight-vertex"
                classList={{
                  selected: editor.isSelected(vertex),
                }}
                cx={vertex.x}
                cy={vertex.y}
                role="button"
                tabindex={editor.tool() === 'select' ? 0 : -1}
                style={{'--weight': editor.influence(vertex)}}
                aria-label={`${vertex.partId} 정점 ${vertex.vertexIndex + 1}`}
                aria-pressed={editor.isSelected(vertex)}
                onClick={(event) => editor.select(vertex, event.shiftKey)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    event.stopPropagation()
                    editor.select(vertex, event.shiftKey)
                  }
                }}
              />
            )}
          </For>
          <Show when={editor.tool() === 'paint' && editor.brush.cursor()}>
            {(cursor) => (
              <circle
                class="weight-brush-ring"
                cx={cursor().x}
                cy={cursor().y}
                style={{'--brush-radius': editor.brush.radius()}}
              />
            )}
          </Show>
        </svg>
      </Show>
      {props.renderControls === undefined ? controls : props.renderControls(controls)}
    </>
  )
}
