import {For, Show} from 'solid-js'

import {EditorButton, EditorNumberField, EditorSelect} from '../../design-system'
import type {PuppetDocument, PuppetLookParameter} from '../../player'
import {addLookParameter, removeLookParameter, updateLookParameter} from './look'
import {EditorPropertyGroup} from './EditorPropertyGroup'

export interface LookPropertiesProps {
  readonly disabled?: boolean
  readonly document: PuppetDocument
  readonly onDocumentChange?: (document: PuppetDocument) => void
  readonly onEditEnd?: () => void
  readonly onEditStart?: () => void
}

const STEP = 0.1
const FIELDS = [
  {key: 'x', label: 'X 계수'},
  {key: 'y', label: 'Y 계수'},
  {key: 'xy', label: 'XY 계수'},
] as const

/**
 * Parameters that follow where the model looks (Cubism's Look): each adds
 * `x · X + y · Y + xy · X · Y` for the look point `(X, Y)` in `-1..1` (x right, y up). Players
 * move the point with `setLookTarget`; the SDK's `look_at` does when present.
 */
export const LookProperties = (props: LookPropertiesProps) => {
  const disabled = () => props.disabled === true || props.onDocumentChange === undefined
  const commit = (document: PuppetDocument | undefined) => {
    if (document !== undefined && !disabled()) {
      props.onDocumentChange?.(document)
    }
  }
  const parameterIds = () => (props.document.parameters ?? []).map((parameter) => parameter.id)
  const name = (id: string) =>
    props.document.parameters?.find((parameter) => parameter.id === id)?.name ?? id
  const update = (index: number, changes: Partial<PuppetLookParameter>) =>
    commit(updateLookParameter(props.document, index, changes))
  return (
    <EditorPropertyGroup class="look-properties" title="시선 따라가기">
      <For each={props.document.look ?? []}>
        {(entry, index) => (
          <fieldset class="preset-fields">
            <legend>{name(entry.parameterId)}</legend>
            <EditorSelect
              disabled={disabled()}
              label={`시선 ${index() + 1} 파라미터`}
              optionLabel={name}
              options={parameterIds()}
              value={entry.parameterId}
              onChange={(parameterId) => update(index(), {parameterId})}
            />
            <For each={FIELDS}>
              {(field) => (
                <EditorNumberField
                  disabled={disabled()}
                  label={`시선 ${index() + 1} ${field.label}`}
                  name={`look-${index()}-${field.key}`}
                  step={STEP}
                  value={entry[field.key]}
                  onEditEnd={props.onEditEnd}
                  onEditStart={props.onEditStart}
                  onValueChange={(value) => update(index(), {[field.key]: value})}
                />
              )}
            </For>
            <EditorButton
              aria-label={`시선 ${index() + 1} 삭제`}
              disabled={disabled()}
              onClick={() => commit(removeLookParameter(props.document, index()))}
            >
              <span aria-hidden="true" class="puppet-icon puppet-icon-trash" />
            </EditorButton>
          </fieldset>
        )}
      </For>
      <Show when={(props.document.look?.length ?? 0) < parameterIds().length}>
        <EditorButton
          disabled={disabled()}
          onClick={() => commit(addLookParameter(props.document))}
        >
          <span aria-hidden="true" class="puppet-icon puppet-icon-plus" />
          시선 파라미터 추가
        </EditorButton>
      </Show>
      <small>
        값 += X 계수 · X + Y 계수 · Y + XY 계수 · X · Y (X, Y는 -1~1, 오른쪽·위가 +). 모션 다음,
        호흡 전에 더합니다.
      </small>
    </EditorPropertyGroup>
  )
}
