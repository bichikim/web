import {EditorButton, EditorNumberField} from '../../design-system'
import {createSignal, For, Show} from 'solid-js'
import type {PuppetDocument, PuppetGlue, PuppetVertexReference} from '../../player'
import {addGlue, canGlueVertex, updateGlue} from './glue'
import {getSceneNode, isSceneNodeLocked} from './scene-graph'
import {BoundaryGlueEditor} from './BoundaryGlueEditor'

interface GlueEditorProps {
  readonly sourceVertex?: PuppetVertexReference | null
  readonly onSourceChange?: (vertex: PuppetVertexReference | null) => void
  readonly document: PuppetDocument
  readonly selectedPartIds?: ReadonlyArray<string>
  readonly targetPartId?: string
  readonly partId?: string
  readonly vertexIndex?: number | null
  readonly onDocumentChange?: (document: PuppetDocument) => void
  readonly onEditStart?: () => void
  readonly onEditEnd?: () => void
}

export const GlueEditor = (props: GlueEditorProps) => {
  const PERCENT = 100
  const [localFirst, setLocalFirst] = createSignal<PuppetVertexReference | null>(null)
  const first = () => (props.sourceVertex === undefined ? localFirst() : props.sourceVertex)
  const setFirst = (vertex: PuppetVertexReference | null) => {
    setLocalFirst(vertex)
    props.onSourceChange?.(vertex)
  }
  const selected = (): PuppetVertexReference | undefined =>
    props.partId === undefined || props.vertexIndex === null || props.vertexIndex === undefined
      ? undefined
      : {partId: props.partId, vertexIndex: props.vertexIndex}
  const selectable = () => {
    const vertex = selected()
    return vertex !== undefined && canGlueVertex(props.document, vertex)
  }
  const label = (vertex: PuppetGlue['second']) => {
    const name = getSceneNode(props.document, vertex.partId)?.name ?? vertex.partId
    if ('edge' in vertex) {
      const segment = `${vertex.vertexIndex + 1}–${vertex.edge.endIndex + 1}`
      return `${name} · 경계 ${segment} (${Math.round(vertex.edge.position * PERCENT)}%)`
    }
    return `${name} · 정점 ${vertex.vertexIndex + 1}`
  }
  const connect = () => {
    const source = first()
    const target = selected()
    if (source === null || target === undefined) {
      return
    }
    const document = addGlue(props.document, source, target)
    if (document !== undefined) {
      props.onDocumentChange?.(document)
      setFirst(null)
    }
  }
  const change = (glue: PuppetGlue, values: Pick<PuppetGlue, 'weight' | 'strength'> | null) => {
    const document = updateGlue(props.document, glue.id, values)
    if (document !== undefined) {
      props.onDocumentChange?.(document)
    }
  }
  return (
    <section class="bone-tools" aria-label="Glue 경계 연결">
      <BoundaryGlueEditor
        selectedPartIds={props.selectedPartIds}
        document={props.document}
        partId={props.targetPartId}
        onDocumentChange={props.onDocumentChange}
      />
      <Show
        when={first()}
        fallback={
          <Show when={selected() !== undefined}>
            <EditorButton
              class="mask-action-button"
              disabled={!selectable()}
              onClick={() => setFirst(selected() ?? null)}
            >
              선택 정점에서 연결 시작
            </EditorButton>
          </Show>
        }
      >
        {(vertex) => (
          <>
            <p class="mask-empty-state">
              A: {label(vertex())} — 다른 파츠의 경계 정점을 선택하세요.
            </p>
            <EditorButton
              class="mask-action-button"
              disabled={!selectable() || selected()?.partId === vertex().partId}
              onClick={connect}
            >
              이 정점과 붙이기
            </EditorButton>
            <EditorButton class="mask-action-button" onClick={() => setFirst(null)}>
              연결 취소
            </EditorButton>
          </>
        )}
      </Show>
      <For each={props.document.glue ?? []}>
        {(glue) => (
          <fieldset class="deformer-properties">
            <legend>
              {label(glue.first)} ↔ {label(glue.second)}
            </legend>
            <Show when={!('edge' in glue.second)}>
              <span>B 비율 (%)</span>
              <EditorNumberField
                label={`${glue.id} B 비율`}
                minimum={0}
                maximum={100}
                value={glue.weight * PERCENT}
                disabled={
                  isSceneNodeLocked(props.document, glue.first.partId) ||
                  isSceneNodeLocked(props.document, glue.second.partId)
                }
                onValueChange={(value) =>
                  change(glue, {strength: glue.strength, weight: value / PERCENT})
                }
                onEditStart={props.onEditStart}
                onEditEnd={props.onEditEnd}
              />
              <p class="mask-empty-state">0%는 A 위치, 50%는 중간, 100%는 B 위치에 붙입니다.</p>
            </Show>
            <span>붙임 강도 (%)</span>
            <EditorNumberField
              label={`${glue.id} 붙임 강도`}
              minimum={0}
              maximum={100}
              value={glue.strength * PERCENT}
              disabled={
                isSceneNodeLocked(props.document, glue.first.partId) ||
                isSceneNodeLocked(props.document, glue.second.partId)
              }
              onValueChange={(value) =>
                change(glue, {strength: value / PERCENT, weight: glue.weight})
              }
              onEditStart={props.onEditStart}
              onEditEnd={props.onEditEnd}
            />
            <EditorButton
              class="mask-action-button"
              disabled={
                isSceneNodeLocked(props.document, glue.first.partId) ||
                isSceneNodeLocked(props.document, glue.second.partId)
              }
              onClick={() => change(glue, null)}
            >
              연결 해제
            </EditorButton>
          </fieldset>
        )}
      </For>
    </section>
  )
}
