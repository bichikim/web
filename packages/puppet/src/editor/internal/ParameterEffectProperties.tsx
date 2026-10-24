import {createSignal, For, Index, Show} from 'solid-js'

import {EditorButton, EditorNumberField, EditorSelect} from '../../design-system'
import type {PuppetDocument} from '../../player'
import {EditorPropertyGroup} from './EditorPropertyGroup'
import type {ParameterEffect} from './parameter-effects'

export interface ParameterEffectPropertiesProps<
  Key extends string,
  Entry extends {readonly parameterId: string} & Readonly<Record<Key, number>>,
> {
  readonly disabled?: boolean
  readonly document: PuppetDocument
  readonly effect: ParameterEffect<Key, Entry>
  readonly onDocumentChange?: (document: PuppetDocument) => void
  readonly onEditEnd?: () => void
  readonly onEditStart?: () => void
}

const STEP = 0.1

/**
 * Edits a document's entries of one parameter effect (breathing, looking), one row per entry.
 * Players apply the effects when present (`setBreath`, `setLookTarget`; the SDK does too).
 */
export const ParameterEffectProperties = <
  Key extends string,
  Entry extends {readonly parameterId: string} & Readonly<Record<Key, number>>,
>(
  props: ParameterEffectPropertiesProps<Key, Entry>,
) => {
  const [addButton, setAddButton] = createSignal<HTMLButtonElement>()
  const disabled = () => props.disabled === true || props.onDocumentChange === undefined
  const commit = (document: PuppetDocument | undefined) => {
    if (document === undefined || disabled()) {
      return false
    }
    props.onDocumentChange?.(document)
    return true
  }
  const entries = () => props.effect.entries(props.document)
  const parameterIds = () => (props.document.parameters ?? []).map((parameter) => parameter.id)
  const name = (id: string) =>
    props.document.parameters?.find((parameter) => parameter.id === id)?.name ?? id
  const remove = (index: number) => {
    // The next entry's row takes this one's place, so focus moves to the add action instead of
    // staying on a delete button for another entry.
    if (commit(props.effect.remove(props.document, index))) {
      addButton()?.focus()
    }
  }
  return (
    <EditorPropertyGroup
      class={props.effect.class}
      title={props.effect.title}
      tooltip={props.effect.tooltip}
    >
      {/* Entries are addressed by position, so rows stay mounted while they are edited. */}
      <Index each={entries()}>
        {(entry, index) => (
          <fieldset class="entry-fields">
            <legend>{name(entry().parameterId)}</legend>
            <EditorSelect
              disabled={disabled()}
              label={`${props.effect.label} ${index + 1} 파라미터`}
              optionLabel={name}
              options={parameterIds()}
              value={entry().parameterId}
              onChange={(parameterId) =>
                commit(props.effect.setParameter(props.document, index, parameterId))
              }
            />
            <For each={props.effect.fields}>
              {(field) => (
                <EditorNumberField
                  disabled={disabled()}
                  label={`${props.effect.label} ${index + 1} ${field.label}`}
                  minimum={field.minimum}
                  name={`${props.effect.name}-${index}-${field.key}`}
                  step={STEP}
                  unit={field.unit}
                  value={entry()[field.key]}
                  onEditEnd={props.onEditEnd}
                  onEditStart={props.onEditStart}
                  onValueChange={(value) =>
                    commit(props.effect.setField(props.document, index, field.key, value))
                  }
                />
              )}
            </For>
            <EditorButton
              aria-label={`${props.effect.label} ${index + 1} 삭제`}
              disabled={disabled()}
              onClick={() => remove(index)}
            >
              <span aria-hidden="true" class="puppet-icon puppet-icon-trash" />
            </EditorButton>
          </fieldset>
        )}
      </Index>
      <Show when={entries().length < parameterIds().length}>
        <EditorButton
          ref={setAddButton}
          disabled={disabled()}
          onClick={() => commit(props.effect.add(props.document))}
        >
          <span aria-hidden="true" class="puppet-icon puppet-icon-plus" />
          {props.effect.addLabel}
        </EditorButton>
      </Show>
    </EditorPropertyGroup>
  )
}
