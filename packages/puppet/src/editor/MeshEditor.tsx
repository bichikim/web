import {EditorCheckbox} from './internal/EditorCheckbox'
import {createSignal, createUniqueId, Index, Show} from 'solid-js'

import type {MeshEditorProps} from './mesh-editor-contract'
import {getEditorViewBox} from './internal/viewport'
import {type MeshTriangle, useMeshEditor} from './use-mesh-editor'

export type {MeshEditorProps} from './mesh-editor-contract'

const getPolygonPoints = (points: ReadonlyArray<{readonly x: number; readonly y: number}>) =>
  points.map((point) => `${point.x},${point.y}`).join(' ')

const getClosedPath = (points: ReadonlyArray<{readonly x: number; readonly y: number}>) =>
  `${points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ')} Z`

const getBoundaryPath = (
  boundaries: ReadonlyArray<ReadonlyArray<{readonly x: number; readonly y: number}>>,
) => boundaries.map(getClosedPath).join(' ')

const getTrianglePoints = (triangle: MeshTriangle) =>
  getPolygonPoints([triangle.first, triangle.second, triangle.third])

export const MeshEditor = (props: MeshEditorProps) => {
  const editor = useMeshEditor(props)
  const maskClipId = createUniqueId()
  const [maskBoundaryVisible, setMaskBoundaryVisible] = createSignal(true)
  const viewBox = () => getEditorViewBox(props.document)
  const activePartView = () =>
    editor.partViews().find((partView) => partView.partId === editor.part()?.id)

  const displayControls = (
    <div class="display-controls" role="group" aria-label="표시 설정">
      <Show when={editor.clippedPartViews().length > 0}>
        <label class="mask-boundary-toggle">
          <EditorCheckbox
            label="마스크 경계 표시"
            checked={maskBoundaryVisible()}
            onChange={setMaskBoundaryVisible}
          />
          마스크 경계 표시
        </label>
      </Show>
    </div>
  )

  return (
    <div class="mesh-editor">
      <Show when={editor.partViews().length > 0}>
        <svg
          aria-label="메시 정점 편집 영역"
          tabIndex={0}
          preserveAspectRatio="xMidYMid meet"
          style={{'--active-mask-clip': `url("#${maskClipId}")`}}
          viewBox={`${viewBox().x} ${viewBox().y} ${viewBox().width} ${viewBox().height}`}
          onClick={editor.handleCanvasClick}
          onDblClick={editor.handleAddVertex}
          onKeyDown={editor.handleKeyDown}
          onPointerCancel={editor.handlePointerCancel}
          onPointerMove={editor.handlePointerMove}
          onPointerUp={editor.handlePointerEnd}
        >
          <defs>
            <clipPath id={maskClipId}>
              <Show when={activePartView()}>
                {(partView) => (
                  <path clip-rule="evenodd" d={getBoundaryPath(partView().boundaryLoops)} />
                )}
              </Show>
            </clipPath>
          </defs>
          <Index each={editor.partViews()}>
            {(partView) => (
              <g data-part-id={partView().partId}>
                <Index each={partView().triangles}>
                  {(triangle) => <polygon points={getTrianglePoints(triangle())} />}
                </Index>
                <Index each={partView().vertices}>
                  {(vertex) => (
                    <circle
                      classList={{
                        selected:
                          editor.part()?.id === partView().partId &&
                          editor.selectedVertex() === vertex().index,
                      }}
                      cx={vertex().x}
                      cy={vertex().y}
                      r={editor.vertexRadius()}
                      onPointerDown={(event) =>
                        editor.handlePointerDown(event, partView().partId, vertex())
                      }
                    />
                  )}
                </Index>
              </g>
            )}
          </Index>
          <Show when={maskBoundaryVisible()}>
            <Index each={editor.clippedPartViews()}>
              {(clippedPartView) => (
                <g
                  aria-label={`${clippedPartView().partId} 클리핑 적용 영역`}
                  class="clipped-part-preview"
                  data-clipped-part-id={clippedPartView().partId}
                >
                  <path
                    class="clipped-part-boundary boundary-base"
                    d={getBoundaryPath(clippedPartView().boundaryLoops)}
                    fill-rule="evenodd"
                  />
                  <path
                    class="clipped-part-boundary boundary-dashes"
                    d={getBoundaryPath(clippedPartView().boundaryLoops)}
                    fill-rule="evenodd"
                  />
                </g>
              )}
            </Index>
          </Show>
        </svg>
      </Show>
      {props.renderDisplayControls === undefined
        ? displayControls
        : props.renderDisplayControls(displayControls)}
    </div>
  )
}
