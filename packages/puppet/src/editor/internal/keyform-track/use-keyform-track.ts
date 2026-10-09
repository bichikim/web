import {type Accessor, createSignal} from 'solid-js'
import {
  isTwoDimensionalParameterBinding,
  parameterValuesEqual,
  type PuppetParameterValues,
} from '../../../deformation'
import type {PuppetParameter} from '../../../player/document'
import type {EditorContextMenuAction, EditorContextMenuEntry} from '../EditorContextMenu'
import {getParameterPointerValue} from '../parameter-value'
import {isTouchContextRequest} from './is-touch-context-request'
import type {EditorKeyformTrackProps} from './types'

export interface UseKeyformTrackProps {
  readonly source: Accessor<EditorKeyformTrackProps>
}

export interface UseKeyformTrackResult {
  readonly contextEntries: Accessor<ReadonlyArray<EditorContextMenuEntry>>
  readonly firstParameter: Accessor<PuppetParameter | undefined>
  readonly secondParameter: Accessor<PuppetParameter | undefined>
  readonly restoreFocus: Accessor<boolean>
  readonly handleContextMenu: (event: MouseEvent & {readonly currentTarget: HTMLDivElement}) => void
  readonly handleDoubleClick: (event: MouseEvent & {readonly currentTarget: HTMLDivElement}) => void
  readonly handleGridContextMenu: (event: MouseEvent) => void
  readonly handleInteractOutside: () => void
  readonly handleKeyDown: (event: KeyboardEvent) => void
  readonly handleKeyformAdd: (values: PuppetParameterValues) => void
  readonly handleMenuOpenChange: (open: boolean) => void
  readonly handleOneDimensionalTrackPointerDown: (
    event: PointerEvent & {readonly currentTarget: HTMLDivElement},
  ) => void
  readonly handleTriggerRequest: (event: MouseEvent) => void
  readonly handleValueChange: (values: PuppetParameterValues) => void
  readonly prepareContextMenu: (values: PuppetParameterValues) => void
}

const getTrackValues = (
  source: EditorKeyformTrackProps,
  event: MouseEvent & {readonly currentTarget: HTMLDivElement},
): PuppetParameterValues | undefined => {
  const [parameter] = source.parameters
  if (
    parameter === undefined ||
    (event.target instanceof Element && event.target.closest('.keyform-marker') !== null)
  ) {
    return undefined
  }
  const bounds = event.currentTarget.getBoundingClientRect()
  return [getParameterPointerValue(parameter, bounds.left, bounds.width, event.clientX)]
}

const handleFocusedDeletion = (source: EditorKeyformTrackProps, event: KeyboardEvent) => {
  if (
    (event.key !== 'Backspace' && event.key !== 'Delete') ||
    event.defaultPrevented ||
    event.repeat ||
    event.isComposing ||
    event.altKey ||
    event.ctrlKey ||
    event.metaKey ||
    event.shiftKey ||
    !source.active ||
    source.activeKeyformValues === null ||
    source.activeKeyformValues === undefined ||
    source.onKeyformDelete === undefined
  ) {
    return
  }
  event.preventDefault()
  event.stopPropagation()
  source.onKeyformDelete()
  if (event.currentTarget instanceof HTMLElement) {
    event.currentTarget.focus()
  }
}

export const useKeyformTrack = (props: UseKeyformTrackProps): UseKeyformTrackResult => {
  const [requestedValues, setRequestedValues] = createSignal<PuppetParameterValues | null>(null)
  const [interactedOutside, setInteractedOutside] = createSignal(false)
  const firstParameter = () => props.source().parameters[0]
  const secondParameter = () => props.source().parameters[1]
  const contextValues = (): PuppetParameterValues => {
    const source = props.source()
    return (
      requestedValues() ??
      source.values ??
      (isTwoDimensionalParameterBinding(source.binding)
        ? [source.parameters[0]?.defaultValue ?? 0, source.parameters[1]?.defaultValue ?? 0]
        : [source.parameters[0]?.defaultValue ?? 0])
    )
  }
  const hasKeyform = (values: PuppetParameterValues) =>
    props.source().binding.keyforms.some((keyform) => parameterValuesEqual(keyform.values, values))
  const selectValues = (values: PuppetParameterValues) => {
    const source = props.source()
    source.onBindingSelect?.(source.binding.id)
    source.onValueChange?.(values)
  }
  const prepareContextMenu = (values: PuppetParameterValues) => {
    setRequestedValues(values)
    selectValues(values)
  }
  const handleKeyformAdd = (values: PuppetParameterValues) => {
    const source = props.source()
    if (source.onKeyformAdd !== undefined && !hasKeyform(values)) {
      selectValues(values)
      source.onKeyformAdd()
    }
  }
  const handleContextDelete = () => {
    selectValues(contextValues())
    props.source().onKeyformDelete?.()
  }
  const contextEntries = (): ReadonlyArray<EditorContextMenuEntry> => {
    const source = props.source()
    const occupied = hasKeyform(contextValues())
    const entries: ReadonlyArray<EditorContextMenuAction> = [
      {
        disabled: source.onKeyformAdd === undefined || occupied,
        id: 'add-keyform',
        label: '키폼 추가',
        onSelect: () => handleKeyformAdd(contextValues()),
        type: 'action',
      },
      {
        disabled: source.onKeyformDelete === undefined || !occupied,
        id: 'delete-keyform',
        label: '키폼 삭제',
        onSelect: handleContextDelete,
        shortcut: 'Backspace',
        tone: 'danger',
        type: 'action',
      },
    ]
    return entries.filter((entry) => !entry.disabled)
  }
  const handleDoubleClick = (event: MouseEvent & {readonly currentTarget: HTMLDivElement}) => {
    const values = getTrackValues(props.source(), event)
    if (values !== undefined) {
      event.currentTarget.focus()
      handleKeyformAdd(values)
    }
  }
  const handleContextMenu = (event: MouseEvent & {readonly currentTarget: HTMLDivElement}) => {
    const values = getTrackValues(props.source(), event)
    if (values !== undefined) {
      prepareContextMenu(values)
    }
  }
  const handleGridContextMenu = (event: MouseEvent) => {
    if (!(event.target instanceof Element) || event.target.closest('.parameter-grid') === null) {
      prepareContextMenu(props.source().values ?? [0, 0])
    }
  }
  const handleValueChange = (values: PuppetParameterValues) => {
    const source = props.source()
    if (!source.active) {
      source.onBindingSelect?.(source.binding.id)
    }
    source.onValueChange?.(values)
  }
  const handleOneDimensionalTrackPointerDown = (
    event: PointerEvent & {readonly currentTarget: HTMLDivElement},
  ) => {
    if (isTouchContextRequest(event)) {
      handleContextMenu(event)
    }
    const source = props.source()
    if (
      event.button !== 0 ||
      event.target !== event.currentTarget ||
      source.onValueChange === undefined
    ) {
      return
    }
    const values = getTrackValues(source, event)
    if (values !== undefined) {
      event.preventDefault()
      handleValueChange(values)
    }
  }
  const handleMenuOpenChange = (open: boolean) => {
    if (open) {
      setInteractedOutside(false)
    } else {
      setRequestedValues(null)
    }
  }
  const handleTriggerRequest = (event: MouseEvent) => {
    if (event.target === event.currentTarget) {
      setRequestedValues(null)
    }
  }
  return {
    contextEntries,
    firstParameter,
    handleContextMenu,
    handleDoubleClick,
    handleGridContextMenu,
    handleInteractOutside: () => setInteractedOutside(true),
    handleKeyDown: (event) => handleFocusedDeletion(props.source(), event),
    handleKeyformAdd,
    handleMenuOpenChange,
    handleOneDimensionalTrackPointerDown,
    handleTriggerRequest,
    handleValueChange,
    prepareContextMenu,
    restoreFocus: () => !interactedOutside(),
    secondParameter,
  }
}
