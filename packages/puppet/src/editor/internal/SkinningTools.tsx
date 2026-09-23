import {SkinningJoints} from './SkinningJoints'
import {getDeformerPreviewDocument} from './mesh-preview'
import {SkinningControls} from './SkinningControls'
import {Index, Show} from 'solid-js'
import {type SkinningToolsProps, useSkinningTools} from './use-skinning-tools'
import {getEditorViewBox} from './viewport'

const PERCENT = 100
export const SkinningTools = (props: SkinningToolsProps) => {
  const state = useSkinningTools(props)
  const viewBox = () => getEditorViewBox(props.document)
  const weight = (index: number) => state.binding()?.influences[state.target()]?.weights[index] ?? 0
  const controls = <SkinningControls state={state} sourceDocument={props.sourceDocument} />

  return (
    <>
      {props.renderControls === undefined ? controls : props.renderControls(controls)}
      <Show when={state.enabled() && state.binding() !== undefined}>
        <div class="skin-inspection">
          <svg
            aria-label="스키닝 가중치 편집 영역"
            tabIndex={0}
            preserveAspectRatio="xMidYMid meet"
            viewBox={`${viewBox().x} ${viewBox().y} ${viewBox().width} ${viewBox().height}`}
            onPointerDown={state.start}
            onPointerMove={state.move}
            onPointerUp={state.end}
            onPointerCancel={state.end}
            onLostPointerCapture={state.end}
            onPointerLeave={state.leave}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                state.stop()
                state.setEnabled(false)
              }
            }}
          >
            <Index each={state.triangles()}>
              {(triangle) => (
                <polygon
                  class="skin-heat-triangle"
                  data-flipped={triangle().flipped}
                  data-stretched={triangle().stretched}
                  style={{
                    '--weight':
                      triangle().indices.reduce((sum, index) => sum + weight(index), 0) /
                      triangle().indices.length,
                  }}
                  points={triangle()
                    .indices.map(
                      (index) =>
                        `${state.positions()[index * 2]},${state.positions()[index * 2 + 1]}`,
                    )
                    .join(' ')}
                >
                  <title>
                    {triangle().flipped
                      ? '뒤집힌 삼각형'
                      : triangle().stretched
                        ? '2배 초과 늘어남'
                        : '가중치 영역'}
                  </title>
                </polygon>
              )}
            </Index>
            <Index each={state.binding()!.influences[0]!.weights}>
              {(_, index) => (
                <circle
                  class="skin-weight-point"
                  data-selected={state.selected().includes(index)}
                  style={{'--weight': weight(index)}}
                  cx={state.positions()[index * 2]}
                  cy={state.positions()[index * 2 + 1]}
                  role="button"
                  tabIndex={state.tool() === 'select' ? 0 : undefined}
                  aria-label={`정점 ${index + 1} 가중치 ${Math.round(weight(index) * PERCENT)}%`}
                  aria-pressed={state.selected().includes(index)}
                  onPointerDown={(event) => {
                    if (state.tool() === 'select') {
                      event.stopPropagation()
                      event.preventDefault()
                      state.select(index, event.shiftKey)
                    }
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      state.select(index, event.shiftKey)
                    }
                  }}
                />
              )}
            </Index>
            <Show when={state.cursor() !== null && state.tool() !== 'select'}>
              <circle
                class="weight-brush-ring"
                cx={state.cursor()!.x}
                cy={state.cursor()!.y}
                style={{'--brush-radius': state.radius()}}
              />
            </Show>
            <SkinningJoints document={getDeformerPreviewDocument(props)} />
          </svg>
        </div>
      </Show>
    </>
  )
}
