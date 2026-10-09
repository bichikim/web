import {type Accessor, createEffect, createMemo, createSignal} from 'solid-js'
import type {CodeDocument} from '../shared/contracts'
import {useFileViewState} from './view-state/context'

interface UseDocumentModeProps {
  readonly document: Accessor<CodeDocument>
  readonly sourceAvailable: Accessor<boolean>
  readonly searchVisible: Accessor<boolean>
  readonly onPreview?: () => void
  readonly onError?: (error: unknown) => void
}

export const useDocumentMode = (props: UseDocumentModeProps) => {
  const state = useFileViewState()
  const path = createMemo(() => props.document().location.path)
  const mode = createMemo(() => {
    path()
    const [original, setOriginal] = createSignal(state?.read()?.original ?? false)
    return {original, setOriginal}
  })
  const showOriginal = (): void => {
    mode().setOriginal(true)
    state?.update({original: true})
  }
  createEffect(() => {
    if (
      props.sourceAvailable() &&
      (props.searchVisible() ||
        props.document().location.line > 1 ||
        state?.request().restore === false)
    ) {
      showOriginal()
    }
  })
  const showPreview = (): void => {
    props.onPreview?.()
    mode().setOriginal(false)
    state?.update({original: false})
  }
  const reportTableError = (error: unknown): void => {
    showOriginal()
    props.onError?.(error)
  }
  return {original: () => mode().original(), reportTableError, showOriginal, showPreview}
}
