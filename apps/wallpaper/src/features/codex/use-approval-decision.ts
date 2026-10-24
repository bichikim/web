import {createSignal, onCleanup} from 'solid-js'
import type {CodexApprovalDecision, CodexPort} from './types'
import {codexPort} from './native'

interface UseApprovalDecisionProps {
  readonly requestId: () => string
  readonly decide?: () => CodexPort['decideApproval']
}
export const useApprovalDecision = (props: UseApprovalDecisionProps) => {
  const [busy, setBusy] = createSignal(false)
  const [error, setError] = createSignal<string | null>(null)
  let disposed = false
  onCleanup(() => {
    disposed = true
  })
  const decide = async (decision: CodexApprovalDecision) => {
    const operation = props.decide?.() ?? codexPort.decideApproval
    if (busy() || operation === undefined) {
      return
    }
    setBusy(true)
    setError(null)
    try {
      await operation(props.requestId(), decision)
    } catch {
      if (!disposed) {
        setError('요청이 종료됐거나 연결이 끊겼습니다.')
      }
    } finally {
      if (!disposed) {
        setBusy(false)
      }
    }
  }
  return {busy, decide, error}
}
