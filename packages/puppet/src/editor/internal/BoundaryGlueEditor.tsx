import {EditorButton, EditorSegmentedField, EditorNumberField} from '../../design-system'
import {createMemo, createSignal, Show} from 'solid-js'
import type {PuppetDocument} from '../../player'
import {addBoundaryGlue} from './boundary-glue'

interface BoundaryGlueEditorProps {
  readonly document: PuppetDocument
  readonly partId?: string
  readonly selectedPartIds?: ReadonlyArray<string>
  readonly onDocumentChange?: (document: PuppetDocument) => void
}

export const BoundaryGlueEditor = (props: BoundaryGlueEditorProps) => {
  const [distance, setDistance] = createSignal(0)
  const [manual, setManual] = createSignal(false)
  const pair = createMemo(() => {
    const ids = props.selectedPartIds ?? []
    const target = props.partId
    const source = ids.find((id) => id !== target)
    return ids.length === 2 && target !== undefined && ids.includes(target) && source !== undefined
      ? {source, target}
      : undefined
  })
  const preview = createMemo(() => {
    const selected = pair()
    return selected === undefined
      ? undefined
      : addBoundaryGlue(
          props.document,
          selected.source,
          selected.target,
          manual() ? distance() : undefined,
        )
  })
  return (
    <fieldset class="deformer-properties">
      <legend>선택 파츠 붙이기</legend>
      <EditorButton
        class="mask-action-button"
        disabled={preview() === undefined}
        onClick={() => {
          const document = preview()
          if (document !== undefined) {
            props.onDocumentChange?.(document)
          }
        }}
      >
        붙이기
      </EditorButton>
      <div class="glue-distance-mode">
        <span>연결 거리</span>
        <EditorSegmentedField
          label="연결 거리 방식"
          value={manual() ? 'manual' : 'auto'}
          options={[
            {label: '자동', value: 'auto'},
            {label: '수동', value: 'manual'},
          ]}
          onChange={(value) => setManual(value === 'manual')}
        />
      </div>
      <Show when={manual()}>
        <label>
          <span>거리</span>
          <EditorNumberField
            label="경계 연결 거리"
            minimum={0}
            value={distance()}
            onValueChange={setDistance}
          />
        </label>
      </Show>
    </fieldset>
  )
}
