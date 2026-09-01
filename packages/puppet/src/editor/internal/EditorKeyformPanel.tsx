import {Button} from '@kobalte/core/button'
import {clamp} from 'es-toolkit/math'
import {createUniqueId, For, onCleanup, Show} from 'solid-js'

import type {PuppetParameter} from '../../player/document'
import {EditorParameterItem} from './EditorParameterItem'

const PERCENT = 100
const VALUE_PRECISION = 6
const VALUE_STEPS = 120

interface ParameterValueScrubberProps {
  readonly onValueChange?: (value: number) => void
  readonly parameter: PuppetParameter
  readonly value: number
}

const getProgress = (parameter: PuppetParameter, value: number) =>
  ((value - parameter.minimum) / (parameter.maximum - parameter.minimum)) * PERCENT

const getPointerValue = (
  parameter: PuppetParameter,
  bounds: DOMRect,
  clientX: number,
): number | undefined => {
  if (bounds.width <= 0) {
    return undefined
  }

  const progress = clamp((clientX - bounds.left) / bounds.width, 0, 1)
  const value = parameter.minimum + progress * (parameter.maximum - parameter.minimum)
  const step = (parameter.maximum - parameter.minimum) / VALUE_STEPS
  const steppedValue = parameter.minimum + Math.round((value - parameter.minimum) / step) * step
  return Number(clamp(steppedValue, parameter.minimum, parameter.maximum).toFixed(VALUE_PRECISION))
}

const ParameterValueScrubber = (props: ParameterValueScrubberProps) => {
  let removePointerListeners: (() => void) | undefined
  const handleKeyDown = (event: KeyboardEvent) => {
    const step = (props.parameter.maximum - props.parameter.minimum) / VALUE_STEPS
    let value: number | undefined

    switch (event.key) {
      case 'ArrowLeft':
      case 'ArrowDown':
        value = props.value - step
        break
      case 'ArrowRight':
      case 'ArrowUp':
        value = props.value + step
        break
      case 'End':
        value = props.parameter.maximum
        break
      case 'Home':
        value = props.parameter.minimum
        break
      default:
        return
    }

    event.preventDefault()
    props.onValueChange?.(
      Number(
        clamp(value, props.parameter.minimum, props.parameter.maximum).toFixed(VALUE_PRECISION),
      ),
    )
  }
  const handlePointerDown = (event: PointerEvent & {readonly currentTarget: HTMLButtonElement}) => {
    if (event.button !== 0 || props.onValueChange === undefined) {
      return
    }

    const bounds = event.currentTarget.parentElement?.getBoundingClientRect()
    if (bounds === undefined) {
      return
    }

    const updateValue = (clientX: number) => {
      const value = getPointerValue(props.parameter, bounds, clientX)
      if (value !== undefined) {
        props.onValueChange?.(value)
      }
    }
    const handlePointerMove = (moveEvent: PointerEvent) => {
      moveEvent.preventDefault()
      updateValue(moveEvent.clientX)
    }
    const finishPointerDrag = () => removePointerListeners?.()

    event.preventDefault()
    event.stopPropagation()
    removePointerListeners?.()
    updateValue(event.clientX)
    // The stored callback only removes native drag listeners during completion or cleanup.
    // eslint-disable-next-line solid/reactivity
    removePointerListeners = () => {
      window.removeEventListener('pointercancel', finishPointerDrag)
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', finishPointerDrag)
      removePointerListeners = undefined
    }
    window.addEventListener('pointercancel', finishPointerDrag)
    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', finishPointerDrag)
  }

  onCleanup(() => removePointerListeners?.())

  return (
    <button
      aria-label={`${props.parameter.name} 현재 값`}
      aria-orientation="horizontal"
      aria-valuemax={props.parameter.maximum}
      aria-valuemin={props.parameter.minimum}
      aria-valuenow={props.value}
      class="keyform-value-indicator"
      role="slider"
      style={{left: `${getProgress(props.parameter, props.value)}%`}}
      type="button"
      onKeyDown={handleKeyDown}
      onPointerDown={handlePointerDown}
    />
  )
}

interface KeyformTrackRowProps {
  readonly active: boolean
  readonly activeKeyformValue?: number | null
  readonly onKeyformSelect?: (parameterId: string, value: number) => void
  readonly onParameterDelete?: (parameterId: string) => void
  readonly onParameterNameChange?: (parameterId: string, name: string) => void
  readonly onParameterSelect?: (parameterId: string) => void
  readonly onValueChange?: (value: number) => void
  readonly parameter: PuppetParameter
  readonly value?: number
}

const KeyformTrackRow = (props: KeyformTrackRowProps) => (
  <>
    <div class="keyform-track-label">
      <EditorParameterItem
        keyformCount={props.parameter.keyforms.length}
        maximum={props.parameter.maximum}
        minimum={props.parameter.minimum}
        name={props.parameter.name}
        pressed={props.active}
        value={props.parameter.defaultValue}
        onDelete={
          props.onParameterDelete === undefined
            ? undefined
            : () => props.onParameterDelete?.(props.parameter.id)
        }
        onNameChange={(name) => props.onParameterNameChange?.(props.parameter.id, name)}
        onNameEdit={() => props.onParameterSelect?.(props.parameter.id)}
        onSelect={() => props.onParameterSelect?.(props.parameter.id)}
      />
    </div>
    <div class="keyform-track" aria-label={`${props.parameter.name} 키폼 트랙`}>
      <Show when={props.active}>
        <ParameterValueScrubber
          parameter={props.parameter}
          value={props.value ?? props.parameter.defaultValue}
          onValueChange={props.onValueChange}
        />
      </Show>
      <For each={props.parameter.keyforms}>
        {(keyform) => (
          <button
            aria-label={`${props.parameter.name} ${keyform.value} 키폼`}
            aria-pressed={props.active && props.activeKeyformValue === keyform.value}
            class="keyform-marker"
            style={{left: `${getProgress(props.parameter, keyform.value)}%`}}
            type="button"
            onClick={() => props.onKeyformSelect?.(props.parameter.id, keyform.value)}
          >
            <span>{keyform.value}</span>
          </button>
        )}
      </For>
    </div>
  </>
)

export interface EditorKeyformPanelProps {
  readonly activeKeyformValue?: number | null
  readonly activeParameterId?: string
  readonly onKeyformAdd?: () => void
  readonly onKeyformDelete?: () => void
  readonly onKeyformSelect?: (parameterId: string, value: number) => void
  readonly onParameterAdd?: () => void
  readonly onParameterDelete?: (parameterId: string) => void
  readonly onParameterNameChange?: (parameterId: string, name: string) => void
  readonly onParameterSelect?: (parameterId: string) => void
  readonly onSelectionConnect?: () => void
  readonly onSelectionDisconnect?: () => void
  readonly onValueChange?: (value: number) => void
  readonly parameters: ReadonlyArray<PuppetParameter>
  readonly selectedPartIds?: ReadonlyArray<string>
  readonly targetPartIds?: ReadonlyArray<string>
  readonly value?: number
}

export const EditorKeyformPanel = (props: EditorKeyformPanelProps) => {
  const titleId = createUniqueId()
  const activeParameter = () =>
    props.parameters.find((parameter) => parameter.id === props.activeParameterId)
  const selectedPartIds = () => props.selectedPartIds ?? []
  const targetPartIds = () => props.targetPartIds ?? []
  const selectedTargetCount = () => {
    const targetIds = new Set(targetPartIds())
    return selectedPartIds().filter((partId) => targetIds.has(partId)).length
  }
  const handleValueInput = (event: InputEvent & {readonly currentTarget: HTMLInputElement}) => {
    props.onValueChange?.(event.currentTarget.valueAsNumber)
  }

  return (
    <section class="keyform-panel" aria-labelledby={titleId}>
      <header class="keyform-toolbar">
        <div class="keyform-parameter-heading">
          <span id={titleId}>Parameters</span>
          <Button
            aria-label="Parameter 추가"
            class="panel-add-button"
            disabled={props.onParameterAdd === undefined}
            type="button"
            onClick={() => props.onParameterAdd?.()}
          >
            +
          </Button>
        </div>
        <div class="keyform-actions">
          <button
            disabled={activeParameter() === undefined || props.onKeyformAdd === undefined}
            type="button"
            onClick={() => props.onKeyformAdd?.()}
          >
            + 현재 값에 키폼
          </button>
          <button
            class="danger"
            disabled={
              props.activeKeyformValue === undefined ||
              props.activeKeyformValue === null ||
              props.onKeyformDelete === undefined
            }
            type="button"
            onClick={() => props.onKeyformDelete?.()}
          >
            선택 키폼 삭제
          </button>
        </div>
        <Show when={activeParameter()} fallback={<span class="keyform-current-value">값 —</span>}>
          {(parameter) => (
            <label class="keyform-current-value">
              <span>값</span>
              <input
                aria-label="Parameter 값"
                max={parameter().maximum}
                min={parameter().minimum}
                type="number"
                value={props.value ?? parameter().defaultValue}
                onInput={handleValueInput}
              />
            </label>
          )}
        </Show>
      </header>
      <Show
        when={props.parameters.length > 0}
        fallback={<p class="timeline-empty">Parameter를 추가하세요.</p>}
      >
        <div class="keyform-track-wrap">
          <For each={props.parameters}>
            {(parameter) => (
              <KeyformTrackRow
                active={parameter.id === props.activeParameterId}
                activeKeyformValue={props.activeKeyformValue}
                parameter={parameter}
                value={props.value}
                onKeyformSelect={props.onKeyformSelect}
                onParameterDelete={props.onParameterDelete}
                onParameterNameChange={props.onParameterNameChange}
                onParameterSelect={props.onParameterSelect}
                onValueChange={props.onValueChange}
              />
            )}
          </For>
        </div>
      </Show>
      <footer class="keyform-footer">
        <div class="parameter-target-actions">
          <Button
            disabled={
              activeParameter() === undefined ||
              selectedPartIds().length === 0 ||
              selectedTargetCount() === selectedPartIds().length ||
              props.onSelectionConnect === undefined
            }
            type="button"
            onClick={() => props.onSelectionConnect?.()}
          >
            선택 레이어 연결
          </Button>
          <Button
            disabled={
              activeParameter() === undefined ||
              selectedTargetCount() === 0 ||
              props.onSelectionDisconnect === undefined
            }
            type="button"
            onClick={() => props.onSelectionDisconnect?.()}
          >
            선택 레이어 연결 해제
          </Button>
        </div>
        <p class="keyform-help">
          대상 {targetPartIds().length} · 선택 {selectedPartIds().length}개 파트
        </p>
      </footer>
    </section>
  )
}
