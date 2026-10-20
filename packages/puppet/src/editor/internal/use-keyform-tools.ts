import {createEffect, createSignal, on} from 'solid-js'
import type {EditorKeyformToolsProps} from './EditorKeyformTools'

export const CUSTOM_REFERENCE = 'custom'

export const useKeyformTools = (props: EditorKeyformToolsProps) => {
  const [open, setOpen] = createSignal(false)
  const [operation, setOperation] = createSignal<'mirror' | 'corners'>('mirror')
  const [axis, setAxis] = createSignal<'x' | 'y'>('x')
  const [center, setCenterValue] = createSignal(0)
  // An index into `props.centers` as text, or the custom value typed in.
  const [centerReference, setCenterReference] = createSignal('0')
  const [parameterId, setParameterId] = createSignal('')
  const [overwrite, setOverwrite] = createSignal(false)
  const [reference, setReference] = createSignal<'default' | 'middle'>('default')
  const [planes, setPlanes] = createSignal<'current' | 'all'>('current')
  const [error, setError] = createSignal<string | null>(null)
  const parameters = () => props.parameters ?? []
  const targetCount = () =>
    (props.binding?.targetPartIds?.length ?? 0) + (props.binding?.targetDeformerIds?.length ?? 0)
  const hasSource = () => props.values !== undefined && props.values !== null
  const canApply = () =>
    operation() === 'mirror'
      ? hasSource() && props.onMirror !== undefined
      : (props.binding?.parameterIds.length ?? 0) >= 2 && props.onGenerate !== undefined
  createEffect(
    on(open, (visible) => {
      if (visible) {
        setOperation(hasSource() ? 'mirror' : 'corners')
        setAxis('x')
        setCenterReference(props.centers?.length ? '0' : CUSTOM_REFERENCE)
        setCenterValue(props.centers?.[0]?.point.x ?? 0)
        setParameterId(parameters()[0]?.id ?? '')
        setOverwrite(false)
        setReference('default')
        setPlanes('current')
        setError(null)
      }
    }),
  )
  const referencePoint = () => props.centers?.[Number(centerReference())]?.point
  const handleAxisChange = (value: 'x' | 'y') => {
    setAxis(value)
    setCenterValue(referencePoint()?.[value] ?? center())
  }
  const selectCenterReference = (reference: string) => {
    setCenterReference(reference)
    setCenterValue(referencePoint()?.[axis()] ?? center())
  }
  /** A typed value leaves the chosen reference. */
  const setCenter = (value: number) => {
    setCenterReference(CUSTOM_REFERENCE)
    setCenterValue(value)
  }
  const handleSubmit = (event: SubmitEvent) => {
    event.preventDefault()
    if (!canApply()) {
      return
    }
    const message =
      operation() === 'mirror'
        ? props.onMirror?.({
            axis: axis(),
            center: center(),
            overwrite: overwrite(),
            parameterIndex: parameters().findIndex((parameter) => parameter.id === parameterId()),
          })
        : props.onGenerate?.({overwrite: overwrite(), planes: planes(), reference: reference()})
    setError(message ?? null)
    if (message === null) {
      setOpen(false)
    }
  }
  return {
    axis,
    canApply,
    center,
    centerReference,
    error,
    handleAxisChange,
    handleSubmit,
    hasSource,
    open,
    operation,
    overwrite,
    parameterId,
    parameters,
    planes,
    reference,
    selectCenterReference,
    setCenter,
    setOpen,
    setOperation,
    setOverwrite,
    setParameterId,
    setPlanes,
    setReference,
    targetCount,
  }
}
