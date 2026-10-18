import {createEffect, createSignal, on} from 'solid-js'
import type {EditorKeyformToolsProps} from './EditorKeyformTools'

export const useKeyformTools = (props: EditorKeyformToolsProps) => {
  const [open, setOpen] = createSignal(false)
  const [operation, setOperation] = createSignal<'mirror' | 'corners'>('mirror')
  const [axis, setAxis] = createSignal<'x' | 'y'>('x')
  const [center, setCenter] = createSignal(0)
  const [parameterId, setParameterId] = createSignal('')
  const [overwrite, setOverwrite] = createSignal(false)
  const [reference, setReference] = createSignal<'default' | 'middle'>('default')
  const [error, setError] = createSignal<string | null>(null)
  const parameters = () => props.parameters ?? []
  const targetCount = () =>
    (props.binding?.targetPartIds?.length ?? 0) + (props.binding?.targetDeformerIds?.length ?? 0)
  const hasSource = () => props.values !== undefined && props.values !== null
  const canApply = () =>
    operation() === 'mirror'
      ? hasSource() && props.onMirror !== undefined
      : props.binding?.parameterIds.length === 2 && props.onGenerate !== undefined
  createEffect(
    on(open, (visible) => {
      if (visible) {
        setOperation(hasSource() ? 'mirror' : 'corners')
        setAxis('x')
        setCenter(props.center?.x ?? 0)
        setParameterId(parameters()[0]?.id ?? '')
        setOverwrite(false)
        setReference('default')
        setError(null)
      }
    }),
  )
  const handleAxisChange = (value: 'x' | 'y') => {
    setAxis(value)
    setCenter(props.center?.[value] ?? 0)
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
        : props.onGenerate?.({overwrite: overwrite(), reference: reference()})
    setError(message ?? null)
    if (message === null) {
      setOpen(false)
    }
  }
  return {
    axis,
    canApply,
    center,
    error,
    handleAxisChange,
    handleSubmit,
    hasSource,
    open,
    operation,
    overwrite,
    parameterId,
    parameters,
    reference,
    setCenter,
    setOpen,
    setOperation,
    setOverwrite,
    setParameterId,
    setReference,
    targetCount,
  }
}
