import {InfluenceEditor} from './InfluenceEditor'
import {Button} from '@kobalte/core/button'
import {EditorParameterFooter} from './EditorParameterFooter'
import {
  createSignal,
  createUniqueId,
  For,
  getOwner,
  type JSX,
  onCleanup,
  runWithOwner,
  Show,
} from 'solid-js'
import {
  isTwoDimensionalParameterBinding,
  parameterValuesEqual,
  type PuppetParameterValueMap,
  type PuppetParameterValues,
} from '../../deformation'
import type {
  PuppetParameter,
  PuppetParameterBinding,
  PuppetParameterInfluence,
} from '../../player/document'
import {EditorKeyformMarker} from './EditorKeyformMarker'
import {EditorNumberField} from './EditorNumberField'
import {EditorKeyformToolbar} from './EditorKeyformToolbar'
import {EditorParameterItem} from './EditorParameterItem'
import {
  getParameterKeyboardValue,
  getParameterPointerValue,
  getParameterProgress,
} from './parameter-value'
interface ParameterValueScrubberProps {
  readonly onValueChange?: (values: PuppetParameterValues) => void
  readonly parameter: PuppetParameter
  readonly value: number
}
const ParameterValueScrubber = (props: ParameterValueScrubberProps) => {
  let removePointerListeners: (() => void) | undefined
  const owner = getOwner()
  const canUpdateValue = () => {
    const read = () => props.onValueChange !== undefined
    return owner === null ? read() : runWithOwner(owner, read)
  }
  const updateValue = (value: number) => {
    const update = () => props.onValueChange?.([value])
    return owner === null ? update() : runWithOwner(owner, update)
  }
  const handleKeyDown = (event: KeyboardEvent) => {
    const value = getParameterKeyboardValue(props.parameter, props.value, event.key)
    if (value === undefined) {
      return
    }
    event.preventDefault()
    updateValue(value)
  }
  const handlePointerDown = (event: PointerEvent & {readonly currentTarget: HTMLButtonElement}) => {
    if (event.button !== 0 || !canUpdateValue()) {
      return
    }
    const bounds = event.currentTarget.parentElement?.getBoundingClientRect()
    if (bounds === undefined) {
      return
    }
    const updatePointerValue = (clientX: number) =>
      updateValue(getParameterPointerValue(props.parameter, bounds.left, bounds.width, clientX))
    const {pointerId} = event
    const handlePointerMove = (moveEvent: PointerEvent) => {
      if (moveEvent.pointerId !== pointerId) {
        return
      }
      moveEvent.preventDefault()
      updatePointerValue(moveEvent.clientX)
    }
    const finishPointerDrag = (finishEvent: PointerEvent) => {
      if (finishEvent.pointerId === pointerId) {
        removePointerListeners?.()
      }
    }
    event.preventDefault()
    event.stopPropagation()
    removePointerListeners?.()
    updatePointerValue(event.clientX)
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
    <Button
      aria-label={`${props.parameter.name} 현재 값`}
      aria-orientation="horizontal"
      aria-valuemax={props.parameter.maximum}
      aria-valuemin={props.parameter.minimum}
      aria-valuenow={props.value}
      class="keyform-value-indicator"
      role="slider"
      style={{left: `${getParameterProgress(props.parameter, props.value)}%`}}
      type="button"
      onKeyDown={handleKeyDown}
      onPointerDown={handlePointerDown}
    />
  )
}
interface TwoDimensionalGridProps {
  readonly active?: boolean
  readonly activeKeyformValues?: PuppetParameterValues | null
  readonly binding: PuppetParameterBinding
  readonly onKeyformSelect?: (bindingId: string, values: PuppetParameterValues) => void
  readonly onValueChange?: (values: PuppetParameterValues) => void
  readonly parameters: ReadonlyArray<PuppetParameter>
  readonly values: PuppetParameterValues
}
const TwoDimensionalGrid = (props: TwoDimensionalGridProps) => {
  let removePointerListeners: (() => void) | undefined
  const owner = getOwner()
  const canUpdateValue = () => {
    const read = () => props.onValueChange !== undefined
    return owner === null ? read() : runWithOwner(owner, read)
  }
  const xParameter = () => props.parameters[0]
  const yParameter = () => props.parameters[1]
  const updateFromPointer = (bounds: DOMRect, clientX: number, clientY: number) => {
    const update = () => {
      const x = xParameter()
      const y = yParameter()
      if (x === undefined || y === undefined) {
        return
      }
      props.onValueChange?.([
        getParameterPointerValue(x, bounds.left, bounds.width, clientX),
        getParameterPointerValue(
          y,
          bounds.top,
          bounds.height,
          bounds.top + bounds.bottom - clientY,
        ),
      ])
    }
    if (owner === null) {
      update()
      return
    }
    runWithOwner(owner, update)
  }
  const handlePointerDown = (event: PointerEvent & {readonly currentTarget: HTMLDivElement}) => {
    if (event.button !== 0 || !canUpdateValue()) {
      return
    }

    const bounds = event.currentTarget.getBoundingClientRect()
    const {pointerId} = event
    const handlePointerMove = (moveEvent: PointerEvent) => {
      if (moveEvent.pointerId !== pointerId) {
        return
      }

      moveEvent.preventDefault()
      updateFromPointer(bounds, moveEvent.clientX, moveEvent.clientY)
    }
    const finishPointerDrag = (finishEvent: PointerEvent) => {
      if (finishEvent.pointerId === pointerId) {
        removePointerListeners?.()
      }
    }

    event.preventDefault()
    removePointerListeners?.()
    updateFromPointer(bounds, event.clientX, event.clientY)
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
    <div aria-hidden="true" class="parameter-grid" onPointerDown={handlePointerDown}>
      <Show when={xParameter() !== undefined && yParameter() !== undefined}>
        <span
          class="parameter-grid-current-x"
          style={{
            left: `${getParameterProgress(xParameter()!, props.values[0] ?? xParameter()!.defaultValue)}%`,
          }}
        />
        <span
          class="parameter-grid-current-y"
          style={{
            bottom: `${getParameterProgress(yParameter()!, props.values[1] ?? yParameter()!.defaultValue)}%`,
          }}
        />
      </Show>
      <For each={props.binding.keyforms}>
        {(keyform) => {
          const x = () => xParameter()
          const y = () => yParameter()
          return (
            <Button
              aria-hidden="true"
              class="parameter-grid-keyform"
              classList={{
                selected:
                  props.active === true &&
                  parameterValuesEqual(props.activeKeyformValues ?? [], keyform.values),
              }}
              style={{
                bottom: `${y() === undefined ? 0 : getParameterProgress(y()!, keyform.values[1] ?? 0)}%`,
                left: `${x() === undefined ? 0 : getParameterProgress(x()!, keyform.values[0] ?? 0)}%`,
              }}
              tabindex="-1"
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                props.onKeyformSelect?.(props.binding.id, keyform.values)
              }}
            />
          )
        }}
      </For>
    </div>
  )
}

interface KeyformTrackProps {
  readonly footer?: JSX.Element
  readonly active: boolean
  readonly activeKeyformValues?: PuppetParameterValues | null
  readonly binding: PuppetParameterBinding
  readonly onBindingDelete?: (bindingId: string) => void
  readonly onBindingSelect?: (bindingId: string) => void
  readonly onEditEnd?: () => void
  readonly onEditStart?: () => void
  readonly onKeyformMove?: (
    bindingId: string,
    values: PuppetParameterValues,
    nextValues: PuppetParameterValues,
  ) => void
  readonly onKeyformSelect?: (bindingId: string, values: PuppetParameterValues) => void
  readonly onParameterNameChange?: (bindingId: string, parameterId: string, name: string) => void
  readonly onValueChange?: (values: PuppetParameterValues) => void
  readonly parameters: ReadonlyArray<PuppetParameter>
  readonly values?: PuppetParameterValues
}

interface ParameterValueFieldsProps {
  readonly onEditEnd?: () => void
  readonly onEditStart?: () => void
  readonly onValueChange?: (values: PuppetParameterValues) => void
  readonly parameters: ReadonlyArray<PuppetParameter>
  readonly values?: PuppetParameterValues
}

const ParameterValueFields = (props: ParameterValueFieldsProps) => {
  const updateAxisValue = (axis: number, value: number) => {
    const values = [
      ...(props.values ?? props.parameters.map((parameter) => parameter.defaultValue)),
    ]
    values[axis] = value
    props.onValueChange?.(values as unknown as PuppetParameterValues)
  }

  return (
    <div class="keyform-row-values">
      <For each={props.parameters}>
        {(parameter, index) => (
          <label class="keyform-row-value">
            <span>{parameter.name}</span>
            <EditorNumberField
              label={`${parameter.name} 값`}
              maximum={parameter.maximum}
              minimum={parameter.minimum}
              value={props.values?.[index()] ?? parameter.defaultValue}
              onEditEnd={props.onEditEnd}
              onEditStart={props.onEditStart}
              onValueChange={(value) => updateAxisValue(index(), value)}
            />
          </label>
        )}
      </For>
    </div>
  )
}

const KeyformTrackLabel = (props: KeyformTrackProps) => {
  const firstParameter = () => props.parameters[0]
  const secondParameter = () => props.parameters[1]
  const handleValueChange = (values: PuppetParameterValues) => {
    if (!props.active) {
      props.onBindingSelect?.(props.binding.id)
    }
    props.onValueChange?.(values)
  }

  return (
    <div
      class="keyform-track-label"
      classList={{'parameter-grid-label': isTwoDimensionalParameterBinding(props.binding)}}
    >
      <Show when={firstParameter()}>
        {(parameter) => (
          <EditorParameterItem
            footer={props.footer}
            name={parameter().name}
            pressed={props.active}
            secondaryName={secondParameter()?.name}
            onDelete={
              props.onBindingDelete === undefined
                ? undefined
                : () => props.onBindingDelete?.(props.binding.id)
            }
            onNameChange={(name) =>
              props.onParameterNameChange?.(props.binding.id, parameter().id, name)
            }
            onNameEdit={() => props.onBindingSelect?.(props.binding.id)}
            onSelect={() => props.onBindingSelect?.(props.binding.id)}
          >
            <ParameterValueFields
              onEditEnd={props.onEditEnd}
              onEditStart={props.onEditStart}
              onValueChange={handleValueChange}
              parameters={props.parameters}
              values={props.values}
            />
          </EditorParameterItem>
        )}
      </Show>
    </div>
  )
}

const KeyformTrack = (props: KeyformTrackProps) => {
  const firstParameter = () => props.parameters[0]
  const secondParameter = () => props.parameters[1]
  const handleValueChange = (values: PuppetParameterValues) => {
    if (!props.active) {
      props.onBindingSelect?.(props.binding.id)
    }
    props.onValueChange?.(values)
  }
  const handleOneDimensionalTrackPointerDown = (
    event: PointerEvent & {readonly currentTarget: HTMLDivElement},
  ) => {
    const parameter = firstParameter()
    if (
      event.button !== 0 ||
      event.target !== event.currentTarget ||
      parameter === undefined ||
      props.onValueChange === undefined
    ) {
      return
    }

    event.preventDefault()
    const bounds = event.currentTarget.getBoundingClientRect()
    handleValueChange([
      getParameterPointerValue(parameter, bounds.left, bounds.width, event.clientX),
    ])
  }

  return (
    <Show
      when={isTwoDimensionalParameterBinding(props.binding)}
      fallback={
        <div
          class="keyform-track"
          aria-label={`${firstParameter()?.name ?? 'Parameter'} 키폼 트랙`}
          onPointerDown={handleOneDimensionalTrackPointerDown}
        >
          <Show when={firstParameter()}>
            <ParameterValueScrubber
              parameter={firstParameter()!}
              value={props.values?.[0] ?? firstParameter()!.defaultValue}
              onValueChange={handleValueChange}
            />
          </Show>
          <Show when={firstParameter()}>
            {(parameter) => (
              <For each={props.binding.keyforms}>
                {(keyform) => (
                  <EditorKeyformMarker
                    active={
                      props.active &&
                      parameterValuesEqual(props.activeKeyformValues ?? [], keyform.values)
                    }
                    parameter={parameter()}
                    value={keyform.values[0] ?? parameter().defaultValue}
                    onMove={
                      props.onKeyformMove === undefined
                        ? undefined
                        : (value, nextValue) =>
                            props.onKeyformMove?.(props.binding.id, [value], [nextValue])
                    }
                    onSelect={() => props.onKeyformSelect?.(props.binding.id, keyform.values)}
                  />
                )}
              </For>
            )}
          </Show>
        </div>
      }
    >
      <div
        class="keyform-track parameter-grid-track"
        aria-label={`${firstParameter()?.name}와 ${secondParameter()?.name} 2차원 키폼 grid`}
      >
        <TwoDimensionalGrid
          active={props.active}
          activeKeyformValues={props.activeKeyformValues}
          binding={props.binding}
          parameters={props.parameters}
          values={props.values ?? [0, 0]}
          onKeyformSelect={props.onKeyformSelect}
          onValueChange={handleValueChange}
        />
      </div>
    </Show>
  )
}

export interface EditorKeyformPanelProps {
  readonly influence?: number
  readonly onInfluencesChange?: (influences: ReadonlyArray<PuppetParameterInfluence>) => boolean
  readonly activeBindingId?: string
  readonly activeKeyformValues?: PuppetParameterValues | null
  readonly allParametersVisible?: boolean
  readonly bindings: ReadonlyArray<PuppetParameterBinding>
  readonly onBindingDelete?: (bindingId: string) => void
  readonly onBindingSelect?: (bindingId: string) => void
  readonly onEditEnd?: () => void
  readonly onEditStart?: () => void
  readonly onKeyformAdd?: () => void
  readonly onKeyformDelete?: () => void
  readonly onKeyformMove?: (
    bindingId: string,
    values: PuppetParameterValues,
    nextValues: PuppetParameterValues,
  ) => void
  readonly onKeyformSelect?: (bindingId: string, values: PuppetParameterValues) => void
  readonly onParameterAdd?: () => void
  readonly onParameterNameChange?: (bindingId: string, parameterId: string, name: string) => void
  readonly onSelectionConnect?: () => void
  readonly onSelectionDisconnect?: () => void
  readonly onAllParametersVisibleChange?: (visible: boolean) => void
  readonly onTwoDimensionalParameterAdd?: () => void
  readonly onValueChange?: (values: PuppetParameterValues) => void
  readonly parameterCreationAvailable?: boolean
  readonly parameters: ReadonlyArray<PuppetParameter>
  readonly parameterValueMap?: PuppetParameterValueMap
  readonly selectedPartIds?: ReadonlyArray<string>
  readonly targetPartIds?: ReadonlyArray<string>
  readonly values?: PuppetParameterValues
}

export const EditorKeyformPanel = (props: EditorKeyformPanelProps) => {
  const titleId = createUniqueId()
  const [expandedBinding, setExpandedBinding] = createSignal<string>()
  const activeBinding = () => props.bindings.find((binding) => binding.id === props.activeBindingId)
  const parameterById = () =>
    new Map(props.parameters.map((parameter) => [parameter.id, parameter]))
  const bindingParameters = (binding: PuppetParameterBinding) =>
    binding.parameterIds.flatMap((parameterId) => {
      const parameter = parameterById().get(parameterId)
      return parameter === undefined ? [] : [parameter]
    })
  const bindingValues = (binding: PuppetParameterBinding): PuppetParameterValues => {
    return binding.id === props.activeBindingId && props.values !== undefined
      ? props.values
      : (bindingParameters(binding).map(
          (parameter) => props.parameterValueMap?.[parameter.id] ?? parameter.defaultValue,
        ) as unknown as PuppetParameterValues)
  }
  return (
    <section class="keyform-panel" aria-labelledby={titleId}>
      <EditorKeyformToolbar
        activeBinding={activeBinding()}
        activeKeyformValues={props.activeKeyformValues}
        onKeyformAdd={props.onKeyformAdd}
        onKeyformDelete={props.onKeyformDelete}
        onParameterAdd={props.onParameterAdd}
        onTwoDimensionalParameterAdd={props.onTwoDimensionalParameterAdd}
        parameterCreationAvailable={props.parameterCreationAvailable}
        titleId={titleId}
      />
      <Show
        when={props.bindings.length > 0}
        fallback={<p class="timeline-empty">Parameter를 추가하세요.</p>}
      >
        <div class="keyform-track-wrap">
          <For each={props.bindings.map((binding) => binding.id)}>
            {(bindingId) => {
              const binding = () => props.bindings.find((item) => item.id === bindingId)!
              return (
                <div class="keyform-binding-row" data-binding-id={bindingId}>
                  <div
                    class="keyform-track-scroll"
                    onScroll={(event) => {
                      const current = event.currentTarget
                      const tracks =
                        current.parentElement?.parentElement?.querySelectorAll(
                          '.keyform-track-scroll',
                        )
                      tracks?.forEach((track) => {
                        if (track !== current) {
                          track.scrollLeft = current.scrollLeft
                        }
                      })
                    }}
                  >
                    <div class="keyform-tracks">
                      <KeyformTrack
                        active={bindingId === props.activeBindingId}
                        activeKeyformValues={props.activeKeyformValues}
                        binding={binding()}
                        parameters={bindingParameters(binding())}
                        values={bindingValues(binding())}
                        onBindingSelect={props.onBindingSelect}
                        onKeyformMove={props.onKeyformMove}
                        onKeyformSelect={props.onKeyformSelect}
                        onValueChange={props.onValueChange}
                      />
                    </div>
                  </div>
                  <section class="influence-inline-panel" aria-label="파라미터 영향도">
                    <InfluenceEditor
                      renderTrigger={(trigger) => (
                        <div class="keyform-track-labels">
                          <KeyformTrackLabel
                            footer={trigger}
                            active={bindingId === props.activeBindingId}
                            activeKeyformValues={props.activeKeyformValues}
                            binding={binding()}
                            parameters={bindingParameters(binding())}
                            values={bindingValues(binding())}
                            onBindingDelete={props.onBindingDelete}
                            onBindingSelect={props.onBindingSelect}
                            onEditEnd={props.onEditEnd}
                            onEditStart={props.onEditStart}
                            onParameterNameChange={props.onParameterNameChange}
                            onValueChange={props.onValueChange}
                          />
                        </div>
                      )}
                      title={`${bindingParameters(binding())
                        .map((parameter) => parameter.name)
                        .join(' / ')} · 영향도`}
                      expanded={
                        expandedBinding() === bindingId && props.activeBindingId === bindingId
                      }
                      onExpandedChange={(open) => {
                        if (open) {
                          props.onBindingSelect?.(bindingId)
                        }
                        setExpandedBinding(open ? bindingId : undefined)
                      }}
                      influences={binding().influences}
                      parameters={props.parameters}
                      parameterValues={props.parameterValueMap}
                      onChange={props.onInfluencesChange}
                      onEditStart={props.onEditStart}
                      onEditEnd={props.onEditEnd}
                    />
                  </section>
                </div>
              )
            }}
          </For>
        </div>
      </Show>
      <EditorParameterFooter
        activeBinding={activeBinding()}
        selectedPartIds={props.selectedPartIds}
        targetPartIds={props.targetPartIds}
        influence={props.influence}
        allParametersVisible={props.allParametersVisible}
        onAllParametersVisibleChange={props.onAllParametersVisibleChange}
        onSelectionConnect={props.onSelectionConnect}
        onSelectionDisconnect={props.onSelectionDisconnect}
      />
    </section>
  )
}
