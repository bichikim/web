import {createMemo, createSignal, onCleanup} from 'solid-js'
import type {CodexPort, CodexQuestionRequest} from './types'
import {codexPort} from './native'

interface UseQuestionAnswerProps {
  readonly request: () => CodexQuestionRequest
  readonly answer?: () => CodexPort['answerQuestion']
}
export const useQuestionAnswer = (props: UseQuestionAnswerProps) => {
  const [answers, setAnswers] = createSignal<ReadonlyMap<string, string>>(new Map())
  const [busy, setBusy] = createSignal(false)
  const [error, setError] = createSignal<string | null>(null)
  const complete = createMemo(() =>
    props
      .request()
      .questions.every((question) => (answers().get(question.id) ?? '').trim().length > 0),
  )
  let disposed = false
  onCleanup(() => {
    disposed = true
  })
  const setAnswer = (id: string, value: string) => {
    if (!busy()) {
      setAnswers((current) => new Map(current).set(id, value))
    }
  }
  const submit = async () => {
    const operation = props.answer?.() ?? codexPort.answerQuestion
    if (busy() || !complete() || operation === undefined) {
      return
    }
    setBusy(true)
    setError(null)
    try {
      await operation(props.request().id, Object.fromEntries(answers()))
    } catch {
      if (!disposed) {
        setError('질문이 종료됐거나 연결이 끊겼습니다.')
        setBusy(false)
      }
    }
  }
  return {answers, busy, complete, error, setAnswer, submit}
}
