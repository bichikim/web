import {createSignal, createUniqueId, Index, Show} from 'solid-js'

import type {MeshEditorProps} from './mesh-editor-contract'
import {getEditorViewBox} from './internal/viewport'
import {type MeshPartView, type MeshTriangle, useMeshEditor} from './use-mesh-editor'

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

const getPartLabelPoint = (partView: MeshPartView) => {
  const points = partView.boundaryLoops.flat()
  if (points.length === 0) {
    return undefined
  }

  const horizontal = points.map((point) => point.x)
  return {
    x: (Math.min(...horizontal) + Math.max(...horizontal)) / 2,
    y: Math.min(...points.map((point) => point.y)),
  }
}

export const MeshEditor = (props: MeshEditorProps) => {
  const editor = useMeshEditor(props)
  const maskClipId = createUniqueId()
  const [maskFillVisible, setMaskFillVisible] = createSignal(false)
  const viewBox = () => getEditorViewBox(props.document)
  const activePartView = () =>
    editor.partViews().find((partView) => partView.partId === editor.part()?.id)

  return (
    <div class="mesh-editor">
      <Show when={editor.partViews().length > 0}>
        <svg
          aria-label="메시 정점 편집 영역"
          classList={{'add-tool': editor.tool() === 'add'}}
          preserveAspectRatio="xMidYMid meet"
          style={{'--active-mask-clip': `url("#${maskClipId}")`}}
          viewBox={`${viewBox().x} ${viewBox().y} ${viewBox().width} ${viewBox().height}`}
          onClick={editor.handleAddVertex}
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
          <Index each={editor.clippedPartViews()}>
            {(clippedPartView) => (
              <g
                aria-label={`${clippedPartView().partId} 클리핑 적용 영역`}
                classList={{'clipped-part-preview': true, filled: maskFillVisible()}}
                data-clipped-part-id={clippedPartView().partId}
              >
                <path
                  class="clipped-part-boundary"
                  d={getBoundaryPath(clippedPartView().boundaryLoops)}
                  fill-rule="evenodd"
                />
                <Show keyed when={getPartLabelPoint(clippedPartView())}>
                  {(anchor) => (
                    <text x={anchor.x} y={anchor.y}>
                      클리핑 적용 · {clippedPartView().partId}
                    </text>
                  )}
                </Show>
              </g>
            )}
          </Index>
        </svg>
      </Show>
      <div class="mesh-tools" aria-label="메시 편집 도구">
        <button
          aria-pressed={editor.tool() === 'select'}
          type="button"
          onClick={editor.selectMoveTool}
        >
          선택·이동
        </button>
        <button
          aria-pressed={editor.tool() === 'add'}
          disabled={!editor.canEditTopology()}
          type="button"
          onClick={editor.selectAddTool}
        >
          정점 추가
        </button>
        <button
          disabled={!editor.canEditTopology() || editor.selectedVertex() === null}
          type="button"
          onClick={editor.handleDeleteVertex}
        >
          정점 삭제
        </button>
        <Show when={editor.clippedPartViews().length > 0}>
          <label class="mask-fill-toggle">
            <input
              checked={maskFillVisible()}
              type="checkbox"
              onChange={(event) => setMaskFillVisible(event.currentTarget.checked)}
            />
            마스크 영역 칠해서 보기
          </label>
        </Show>
      </div>
    </div>
  )
}
