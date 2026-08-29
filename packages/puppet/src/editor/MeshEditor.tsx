import {For, Show} from 'solid-js'

import type {MeshEditorProps} from './mesh-editor-contract'
import {getEditorViewBox} from './internal/viewport'
import {type MeshTriangle, useMeshEditor} from './use-mesh-editor'

export type {MeshEditorProps} from './mesh-editor-contract'

const getTrianglePoints = (triangle: MeshTriangle) =>
  [triangle.first, triangle.second, triangle.third]
    .map((point) => `${point.x},${point.y}`)
    .join(' ')

export const MeshEditor = (props: MeshEditorProps) => {
  const editor = useMeshEditor(props)
  const viewBox = () => getEditorViewBox(props.document)

  return (
    <div class="mesh-editor">
      <Show when={editor.part()}>
        <svg
          aria-label="메시 정점 편집 영역"
          classList={{'add-tool': editor.tool() === 'add'}}
          preserveAspectRatio="xMidYMid meet"
          viewBox={`${viewBox().x} ${viewBox().y} ${viewBox().width} ${viewBox().height}`}
          onClick={editor.handleAddVertex}
          onPointerCancel={editor.handlePointerCancel}
          onPointerMove={editor.handlePointerMove}
          onPointerUp={editor.handlePointerEnd}
        >
          <For each={editor.triangles()}>
            {(triangle) => <polygon points={getTrianglePoints(triangle)} />}
          </For>
          <For each={editor.vertices()}>
            {(vertex) => (
              <circle
                classList={{selected: editor.selectedVertex() === vertex.index}}
                cx={vertex.x}
                cy={vertex.y}
                r={editor.vertexRadius()}
                onPointerDown={(event) => editor.handlePointerDown(event, vertex)}
              />
            )}
          </For>
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
        <button aria-pressed={editor.tool() === 'add'} type="button" onClick={editor.selectAddTool}>
          정점 추가
        </button>
        <button
          disabled={editor.selectedVertex() === null}
          type="button"
          onClick={editor.handleDeleteVertex}
        >
          정점 삭제
        </button>
      </div>
    </div>
  )
}
