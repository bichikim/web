import {createMemo, createSignal, onCleanup} from 'solid-js'
import {renderOptions} from '../../src/sequence'
import type {Checkpoint} from '../../src/types'
import {createWorkerClient} from './create-worker-client'
import {initialSession, reduceSession} from './session'
import {highestAnswer} from './highest-answer'
import {parseTrainingJsonl} from './training-jsonl'
import {useDataset} from './use-dataset'
import {useEvaluation} from './use-evaluation'
import {validateTrainingCommand} from './validate-training-command'
import type {Command, Phase, Prompt, TrainingCommand} from './types'

export const useLab = () => {
  const [session, setSession] = createSignal(initialSession())
  const answer = createMemo(() => {
    const {comparison} = session()
    return highestAnswer(comparison?.after, comparison?.prompt.question)
  })
  const data = useDataset()
  const busy = (): boolean => session().phase !== 'idle' && session().phase !== 'ready'
  const loaded = (): boolean => session().phase !== 'idle' && session().phase !== 'loading'
  const client = createWorkerClient({
    onFailure: () =>
      setSession({...initialSession(), error: '모델 작업이 중단됐습니다. 모델을 다시 불러오세요.'}),
    onMessage: (message) => setSession((state) => reduceSession(state, message)),
  })
  const disconnect = (): void => {
    client.close()
    setSession(initialSession())
  }
  const reportError = (cause: unknown): void => {
    setSession((state) => ({
      ...state,
      error: cause instanceof Error ? cause.message : String(cause),
    }))
  }
  const evaluation = useEvaluation({
    busy,
    onChange: () => setSession((state) => ({...state, error: null, evaluation: null})),
    onError: reportError,
  })
  const send = (command: Command, phase: Phase): void => {
    if (busy()) {
      return
    }
    try {
      client.send(command)
      setSession((state) => ({...state, error: null, phase}))
    } catch (cause) {
      disconnect()
      reportError(cause)
    }
  }
  const load = (url: string): void => {
    if (session().phase !== 'idle') {
      return
    }
    const base = new URL(url, location.href)
    if (base.protocol !== 'http:' && base.protocol !== 'https:') {
      throw new TypeError('HTTP 모델 URL을 입력하세요.')
    }
    send({type: 'load', url: base.href}, 'loading')
  }
  const infer = (prompt: Prompt): void => send({prompt, type: 'infer'}, 'inferring')
  const addExample = (prompt: Prompt, index: number): void => {
    const labels = renderOptions(prompt.question)
    if (!Number.isInteger(index) || index < 0 || index >= labels.length) {
      throw new TypeError('정답을 선택하세요.')
    }
    if (busy()) {
      return
    }
    data.append([{...prompt, target: labels.map((_, position) => Number(position === index))}])
  }
  const importExamples = (text: string): void => {
    if (busy()) {
      throw new Error('진행 중인 작업이 끝난 뒤 파일을 가져오세요.')
    }
    const examples = parseTrainingJsonl(text)
    data.append(examples)
    setSession((state) => ({...state, error: null}))
  }
  const removeExample = (id: number): void => {
    if (!busy()) {
      data.remove(id)
    }
  }

  const train = (prompt: Prompt, epochs: number, learningRate: number): void => {
    if (busy()) {
      return
    }
    if (evaluation.importing()) {
      throw new Error('평가 데이터를 모두 가져온 뒤 학습하세요.')
    }
    const command: TrainingCommand = {
      epochs,
      evaluation: evaluation.examples(),
      examples: data.entries().map((entry) => entry.example),
      learningRate,
      prompt,
      type: 'train',
    }
    validateTrainingCommand(command)
    setSession((state) => ({
      ...state,
      cancelling: false,
      evaluation: null,
      evaluationProgress: null,
      losses: [],
      outcome: 'running',
      progress: null,
      total: epochs * command.examples.length,
    }))
    send(command, 'training')
  }
  const cancel = (): void => {
    if (session().phase === 'training') {
      setSession((state) => ({...state, cancelling: true}))
      client.send({type: 'cancel'})
    }
  }
  const reset = (): void => send({type: 'reset'}, 'restoring')
  const exportCheckpoint = (): void => send({type: 'export'}, 'exporting')
  const restore = (checkpoint: Checkpoint): void => send({checkpoint, type: 'restore'}, 'restoring')
  const clearError = (): void => {
    setSession((state) => ({...state, error: null}))
  }
  onCleanup(client.close)
  return {
    addExample,
    answer,
    busy,
    cancel,
    cancelling: () => session().cancelling,
    clearError,
    comparison: () => session().comparison,
    dataset: data.entries,
    disconnect,
    error: () => session().error,
    evaluation,
    evaluationProgress: () => session().evaluationProgress,
    evaluationResult: () => session().evaluation,
    exportCheckpoint,
    exported: () => session().exported,
    importExamples,
    infer,
    load,
    loaded,
    losses: () => session().losses,
    outcome: () => session().outcome,
    phase: () => session().phase,
    progress: () => session().progress,
    removeExample,
    reportError,
    reset,
    restore,
    steps: () => session().steps,
    total: () => session().total,
    train,
  }
}
export type Lab = ReturnType<typeof useLab>
