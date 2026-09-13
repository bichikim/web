import {EditorButton, EditorNumberField} from '../../design-system'
import {For, Show} from 'solid-js'
import {getSceneNode, isSceneNodeLocked} from './scene-graph'
import {BoundaryGlueEditor} from './BoundaryGlueEditor'
import {type GlueEditorProps, useGlueEditor} from './use-glue-editor'

export const GlueEditor = (props: GlueEditorProps) => {
  const PERCENT = 100
  const {
    hasParameter,
    first,
    setFirst,
    selected,
    selectable,
    label,
    connect,
    canEdit,
    sampled,
    change,
    connections,
  } = useGlueEditor(props)
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
      <For each={connections().map((connection) => connection.id)}>
        {(id) => {
          const glue = () => connections().find((connection) => connection.id === id)!
          return (
            <fieldset class="deformer-properties glue-properties">
              <legend title={`${label(glue().first)} ↔ ${label(glue().second)}`}>붙임 조절</legend>
              <Show
                when={
                  props.editMode === 'parameter' &&
                  hasParameter(glue()) &&
                  props.partId !== glue().first.partId
                }
              >
                <p class="mask-empty-state">
                  가중치는{' '}
                  {getSceneNode(props.document, glue().first.partId)?.name ?? glue().first.partId}{' '}
                  파츠에서 편집합니다.
                </p>
              </Show>
              <Show when={!('edge' in glue().second)}>
                <span>B 비율 (%)</span>
                <EditorNumberField
                  label={`${glue().id} B 비율`}
                  minimum={0}
                  maximum={100}
                  value={sampled(glue()).weight * PERCENT}
                  disabled={!canEdit(glue())}
                  onValueChange={(value) =>
                    change(glue(), {strength: sampled(glue()).strength, weight: value / PERCENT})
                  }
                  onEditStart={props.onEditStart}
                  onEditEnd={props.onEditEnd}
                />
                <p class="mask-empty-state">0%는 A 위치, 50%는 중간, 100%는 B 위치에 붙입니다.</p>
              </Show>
              <span>붙임 강도 (%)</span>
              <EditorNumberField
                label={`${glue().id} 붙임 강도`}
                minimum={0}
                maximum={100}
                value={sampled(glue()).strength * PERCENT}
                disabled={!canEdit(glue())}
                onValueChange={(value) =>
                  change(glue(), {strength: value / PERCENT, weight: sampled(glue()).weight})
                }
                onEditStart={props.onEditStart}
                onEditEnd={props.onEditEnd}
              />
              <EditorButton
                class="mask-action-button"
                disabled={
                  isSceneNodeLocked(props.document, glue().first.partId) ||
                  isSceneNodeLocked(props.document, glue().second.partId)
                }
                onClick={() => change(glue(), null)}
              >
                연결 해제
              </EditorButton>
            </fieldset>
          )
        }}
      </For>
    </section>
  )
}
