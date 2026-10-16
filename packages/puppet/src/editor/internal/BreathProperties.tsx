import {For, Show} from 'solid-js'

import {EditorButton, EditorNumberField, EditorSelect} from '../../design-system'
import type {PuppetBreathParameter, PuppetDocument} from '../../player'
import {addBreathParameter, removeBreathParameter, updateBreathParameter} from './breath'
import {EditorPropertyGroup} from './EditorPropertyGroup'

export interface BreathPropertiesProps {
  readonly disabled?: boolean
  readonly document: PuppetDocument
  readonly onDocumentChange?: (document: PuppetDocument) => void
  readonly onEditEnd?: () => void
  readonly onEditStart?: () => void
}

const STEP = 0.1
const FIELDS = [
  {key: 'offset', label: '중심'},
  {key: 'peak', label: '진폭'},
  {key: 'period', label: '주기', unit: 's'},
  {key: 'weight', label: '가중치'},
] as const

/**
 * Automatic breathing (Cubism's Breath): parameters that swing on a sine wave, added after
 * motions and before physics. Players turn it on with `setBreath`; the SDK does when present.
 */
export const BreathProperties = (props: BreathPropertiesProps) => {
  const disabled = () => props.disabled === true || props.onDocumentChange === undefined
  const commit = (document: PuppetDocument | undefined) => {
    if (document !== undefined && !disabled()) {
      props.onDocumentChange?.(document)
    }
  }
  const parameterIds = () => (props.document.parameters ?? []).map((parameter) => parameter.id)
  const name = (id: string) =>
    props.document.parameters?.find((parameter) => parameter.id === id)?.name ?? id
  const update = (index: number, changes: Partial<PuppetBreathParameter>) =>
    commit(updateBreathParameter(props.document, index, changes))
  return (
    <EditorPropertyGroup class="breath-properties" title="자동 호흡">
      <For each={props.document.breath ?? []}>
        {(entry, index) => (
          <fieldset class="preset-fields">
            <legend>{name(entry.parameterId)}</legend>
            <EditorSelect
              disabled={disabled()}
              label={`호흡 ${index() + 1} 파라미터`}
              optionLabel={name}
              options={parameterIds()}
              value={entry.parameterId}
              onChange={(parameterId) => update(index(), {parameterId})}
            />
            <For each={FIELDS}>
              {(field) => (
                <EditorNumberField
                  disabled={disabled()}
                  label={`호흡 ${index() + 1} ${field.label}`}
                  minimum={field.key === 'period' ? STEP : undefined}
                  name={`breath-${index()}-${field.key}`}
                  step={STEP}
                  unit={'unit' in field ? field.unit : undefined}
                  value={entry[field.key]}
                  onEditEnd={props.onEditEnd}
                  onEditStart={props.onEditStart}
                  onValueChange={(value) => update(index(), {[field.key]: value})}
                />
              )}
            </For>
            <EditorButton
              aria-label={`호흡 ${index() + 1} 삭제`}
              disabled={disabled()}
              onClick={() => commit(removeBreathParameter(props.document, index()))}
            >
              <span aria-hidden="true" class="puppet-icon puppet-icon-trash" />
            </EditorButton>
          </fieldset>
        )}
      </For>
      <Show when={(props.document.breath?.length ?? 0) < parameterIds().length}>
        <EditorButton
          disabled={disabled()}
          onClick={() => commit(addBreathParameter(props.document))}
        >
          <span aria-hidden="true" class="puppet-icon puppet-icon-plus" />
          호흡 파라미터 추가
        </EditorButton>
      </Show>
      <small>
        값 += (중심 + 진폭 · sin(2π · 시간 / 주기)) · 가중치. 모션 다음, 물리 전에 더합니다.
      </small>
    </EditorPropertyGroup>
  )
}
