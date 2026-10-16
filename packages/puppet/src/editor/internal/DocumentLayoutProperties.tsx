import {EditorCheckbox, EditorNumberField} from '../../design-system'
import {createUniqueId, For, Show} from 'solid-js'

import type {PuppetDocument, PuppetLayout} from '../../player'
import {EditorPropertyGroup} from './EditorPropertyGroup'

const CENTER = 0.5

export interface DocumentLayoutPropertiesProps {
  readonly disabled?: boolean
  readonly document: PuppetDocument
  readonly onDocumentChange?: (document: PuppetDocument) => void
  readonly onEditEnd?: () => void
  readonly onEditStart?: () => void
}

/** Sets or, with `undefined`, removes the document's default framing. */
export const setDocumentLayout = (
  document: PuppetDocument,
  layout: PuppetLayout | undefined,
): PuppetDocument => {
  if (layout !== undefined) {
    return {...document, layout}
  }
  const {layout: _layout, ...rest} = document
  return rest
}

const RECT_FIELDS = [
  {key: 'x', label: 'X'},
  {key: 'y', label: 'Y'},
  {key: 'width', label: '너비'},
  {key: 'height', label: '높이'},
] as const

/**
 * The rectangle players show by default (Cubism's model Layout) and where it sits on screens
 * of another aspect ratio. Editing always shows the whole canvas.
 */
export const DocumentLayoutProperties = (props: DocumentLayoutPropertiesProps) => {
  const enabledId = createUniqueId()
  const disabled = () => props.disabled === true || props.onDocumentChange === undefined
  const layout = () => props.document.layout
  const commit = (next: PuppetLayout | undefined) => {
    if (!disabled()) {
      props.onDocumentChange?.(setDocumentLayout(props.document, next))
    }
  }
  const update = (changes: Partial<PuppetLayout>) => {
    const current = layout()
    if (current !== undefined) {
      commit({...current, ...changes})
    }
  }
  const align = () => layout()?.align ?? [CENTER, CENTER]
  return (
    <EditorPropertyGroup class="document-layout-properties" title="기본 화면">
      <div class="editor-color-row">
        <label for={enabledId}>기본 화면 영역</label>
        <EditorCheckbox
          checked={layout() !== undefined}
          disabled={disabled()}
          inputId={enabledId}
          label="기본 화면 영역 사용"
          onChange={(enabled) =>
            commit(
              enabled
                ? {
                    height: props.document.viewport.height,
                    width: props.document.viewport.width,
                    x: 0,
                    y: 0,
                  }
                : undefined,
            )
          }
        />
      </div>
      <Show when={layout()}>
        {(current) => (
          <>
            <For each={RECT_FIELDS}>
              {(field) => (
                <label>
                  {field.label}
                  <EditorNumberField
                    disabled={disabled()}
                    label={`기본 화면 ${field.label}`}
                    minimum={field.key === 'width' || field.key === 'height' ? 1 : undefined}
                    name={`document-layout-${field.key}`}
                    step={1}
                    value={current()[field.key]}
                    onEditEnd={props.onEditEnd}
                    onEditStart={props.onEditStart}
                    onValueChange={(value) => update({[field.key]: value})}
                  />
                </label>
              )}
            </For>
            <For each={[0, 1] as const}>
              {(axis) => (
                <label>
                  {axis === 0 ? '가로 맞춤' : '세로 맞춤'}
                  <EditorNumberField
                    disabled={disabled()}
                    label={`기본 화면 ${axis === 0 ? '가로' : '세로'} 맞춤`}
                    maximum={1}
                    minimum={0}
                    name={`document-layout-align-${axis}`}
                    step={0.05}
                    value={align()[axis]}
                    onEditEnd={props.onEditEnd}
                    onEditStart={props.onEditStart}
                    onValueChange={(value) => {
                      const next: [number, number] = [...align()]
                      next[axis] = value
                      update({align: next})
                    }}
                  />
                </label>
              )}
            </For>
          </>
        )}
      </Show>
      <p class="parameter-section-summary">
        플레이어가 처음 보여 줄 문서 영역입니다. 화면 비율이 다르면 맞춤(0 왼쪽·위, 1 오른쪽·아래)에
        따라 놓습니다. 편집 화면은 항상 캔버스 전체를 보여 줍니다.
      </p>
    </EditorPropertyGroup>
  )
}
