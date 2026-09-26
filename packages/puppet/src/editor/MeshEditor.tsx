import {EditorNumberField, EditorToggleButton} from '../design-system'
import {createEffect, createSignal, createUniqueId, Index, Show} from 'solid-js'
import {Portal} from 'solid-js/web'

import type {MeshEditorProps} from './mesh-editor-contract'
import {getEditorViewBox} from './internal/viewport'
import {type MeshTriangle, useMeshEditor, type UseMeshEditorResult} from './use-mesh-editor'

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

interface DeformBrushControlsProps {
  readonly editor: UseMeshEditorResult
}

const DeformBrushControls = (props: DeformBrushControlsProps) => {
  return (
    <div class="deform-brush-toolbar" role="group" aria-label="편집 도구">
      <EditorToggleButton
        size="md"
        aria-label="일반 마우스"
        title="일반 마우스"
        pressed={!props.editor.brushEnabled()}
        onClick={() => props.editor.setBrushEnabled(false)}
      >
        <span class="puppet-icon puppet-icon-pointer" aria-hidden="true" />
        <span>일반 마우스</span>
      </EditorToggleButton>
      <EditorToggleButton
        size="md"
        aria-label="변형 브러시"
        title="변형 브러시"
        pressed={props.editor.brushEnabled()}
        onClick={() => props.editor.setBrushEnabled(true)}
      >
        <span class="puppet-icon puppet-icon-brush" aria-hidden="true" />
        <span>변형 브러시</span>
      </EditorToggleButton>
    </div>
  )
}

const DeformBrushSettings = (props: DeformBrushControlsProps) => (
  <fieldset class="deform-brush-settings" aria-label="변형 브러시 설정">
    <label>
      반경
      <EditorNumberField
        label="변형 브러시 반경"
        value={props.editor.brushRadius()}
        minimum={1}
        onValueChange={props.editor.setBrushRadius}
      />
    </label>
    <label>
      강도
      <EditorNumberField
        label="변형 브러시 강도"
        value={props.editor.brushStrength()}
        minimum={1}
        maximum={100}
        unit="%"
        onValueChange={props.editor.setBrushStrength}
      />
    </label>
    <label>
      경도
      <EditorNumberField
        label="변형 브러시 경도"
        value={props.editor.brushHardness()}
        minimum={0}
        maximum={100}
        unit="%"
        onValueChange={props.editor.setBrushHardness}
      />
    </label>
  </fieldset>
)

export const MeshEditor = (props: MeshEditorProps) => {
  const editor = useMeshEditor(props)
  const maskClipId = createUniqueId()
  const [maskBoundaryVisible, setMaskBoundaryVisible] = createSignal(true)
  createEffect(() => {
    if (
      props.brushControlsExternal &&
      props.brushControlsMount === undefined &&
      editor.brushEnabled()
    ) {
      editor.setBrushEnabled(false)
    }
  })
  const viewBox = () => getEditorViewBox(props.document)
  const activePartView = () =>
    editor.partViews().find((partView) => partView.partId === editor.part()?.id)

  const displayControls = (
    <div class="display-controls" role="group" aria-label="표시 설정">
      <Show when={!props.brushControlsExternal}>
        <DeformBrushControls editor={editor} />
      </Show>
      <Show when={editor.clippedPartViews().length > 0}>
        <EditorToggleButton
          size="md"
          aria-label="마스크 경계 표시"
          title="마스크 경계 표시"
          pressed={maskBoundaryVisible()}
          onClick={() => setMaskBoundaryVisible(!maskBoundaryVisible())}
        >
          <span class="puppet-icon puppet-icon-layers-intersect" aria-hidden="true" />
        </EditorToggleButton>
      </Show>
    </div>
  )

  return (
    <div class="mesh-editor">
      <Show when={editor.brushEnabled() && props.brushSettingsMount}>
        <Portal mount={props.brushSettingsMount!}>
          <DeformBrushSettings editor={editor} />
        </Portal>
      </Show>
      <Show when={props.brushControlsMount}>
        {(mount) => (
          <Portal mount={mount()}>
            <DeformBrushControls editor={editor} />
          </Portal>
        )}
      </Show>
      <Show when={editor.partViews().length > 0}>
        <svg
          aria-label="메시 정점 편집 영역"
          tabIndex={0}
          preserveAspectRatio="xMidYMid meet"
          style={{'--active-mask-clip': `url("#${maskClipId}")`}}
          viewBox={`${viewBox().x} ${viewBox().y} ${viewBox().width} ${viewBox().height}`}
          onClick={(event) => {
            if (!editor.brushEnabled()) {
              editor.handleCanvasClick(event)
            }
          }}
          onDblClick={(event) => {
            if (!editor.brushEnabled()) {
              editor.handleAddVertex(event)
            }
          }}
          onKeyDown={editor.handleKeyDown}
          onPointerDown={editor.handleBrushPointerDown}
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
                      onPointerDown={(event) => {
                        if (!editor.brushEnabled()) {
                          editor.handlePointerDown(event, partView().partId, vertex())
                        }
                      }}
                    />
                  )}
                </Index>
              </g>
            )}
          </Index>
          <Show when={editor.brushEnabled() && editor.brushCursor()}>
            {(cursor) => (
              <circle
                class="deform-brush-ring"
                cx={cursor().x}
                cy={cursor().y}
                style={{'--brush-radius': editor.brushRadius()}}
              />
            )}
          </Show>
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
