import {createSignal, onCleanup} from 'solid-js'
import type {TrainingExample} from '../../src/types'
import {parseEvaluation} from './parse-evaluation'

export interface EvaluationControls {
  readonly busy: () => boolean
  readonly onChange: () => void
  readonly onError: (cause: unknown) => void
}
export const useEvaluation = (controls: EvaluationControls) => {
  const [examples, setExamples] = createSignal<readonly TrainingExample[]>([])
  const [importing, setImporting] = createSignal(false)
  let controller: AbortController | null = null
  const importFile = async (file: File): Promise<void> => {
    if (controls.busy() || importing()) {
      return
    }
    setImporting(true)
    try {
      const parsed = parseEvaluation(await file.text())
      setExamples(parsed)
      controls.onChange()
    } catch (cause) {
      controls.onError(cause)
    } finally {
      setImporting(false)
    }
  }
  const loadSample = async (path = '/datasets/banking77/evaluation.jsonl'): Promise<void> => {
    if (controls.busy() || importing()) {
      return
    }
    setImporting(true)
    controller = new AbortController()
    try {
      const response = await fetch(path, {
        signal: controller.signal,
      })
      if (!response.ok) {
        throw new Error(`평가 데이터를 가져오지 못했습니다: ${response.status}`)
      }
      const parsed = parseEvaluation(await response.text())
      setExamples(parsed)
      controls.onChange()
    } catch (cause) {
      if (!controller.signal.aborted) {
        controls.onError(cause)
      }
    } finally {
      controller = null
      setImporting(false)
    }
  }
  const clear = (): void => {
    if (!controls.busy() && !importing()) {
      setExamples([])
      controls.onChange()
    }
  }
  onCleanup(() => controller?.abort())
  return {clear, examples, importFile, importing, loadSample}
}
